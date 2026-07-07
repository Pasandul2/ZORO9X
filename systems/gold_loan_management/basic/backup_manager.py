"""
Backup and Restore Manager for Gold Loan System
Handles database backups, restoration, and backup location management
"""

import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
import json
import requests
import hashlib
import base64

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    ENCRYPTION_AVAILABLE = True
except ImportError as e:
    ENCRYPTION_AVAILABLE = False
    print(f"Warning: cryptography package not available. Backup encryption disabled.")
    print(f"Import error details: {e}")
except Exception as e:
    ENCRYPTION_AVAILABLE = False
    print(f"Warning: cryptography package error. Backup encryption disabled.")
    print(f"Error details: {e}")



class BackupManager:
    """Manages database backups and restoration"""
    
    def __init__(self, db_path: str, db_file: str = 'gold_loan_basic_database.db'):
        """
        Initialize backup manager
        
        Args:
            db_path: Path to the database file directory
            db_file: Name of the database file
        """
        self.db_path = Path(db_path)
        self.db_file = db_file
        self.db_full_path = self.db_path / db_file
        self.config_file = self.db_path / 'backup_config.json'
        
        # Config and license files are in APP_DIR, not db_path
        # APP_DIR is the same directory where the database file is located
        self.app_config_file = self.db_path / 'gold_loan_config.json'
        self.license_cache_file = self.db_path / 'gold_loan_license.json'
        self.server_api_url_file = self.db_path / 'server_api_url.txt'
        
        self.pending_uploads_file = self.db_path / 'backup_upload_queue.json'
        self.default_backup_dir1 = self.db_path / 'backups'
        self.default_backup_dir2 = self.db_path / 'backups_cloud'
        self.last_backup_path = None
        self.last_backup_name = None
        
        # Load or create backup config
        self.config = self._load_config()
    
    def _derive_encryption_key(self, api_key: str, subscription_id: str, salt: bytes = None) -> tuple:
        """
        Derive encryption key from API key and subscription ID using PBKDF2
        
        Args:
            api_key: API key for authentication
            subscription_id: Subscription ID
            salt: Salt for key derivation (generated if None)
        
        Returns:
            tuple: (key, salt)
        """
        if not ENCRYPTION_AVAILABLE:
            raise RuntimeError("Encryption not available. Install cryptography package.")
        
        if salt is None:
            salt = os.urandom(32)
        
        password = f"{api_key}:{subscription_id}".encode('utf-8')
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key = kdf.derive(password)
        return key, salt
    
    def _encrypt_file(self, input_path: str, output_path: str = None) -> str:
        """
        Encrypt a backup file using AES-256
        
        Args:
            input_path: Path to the file to encrypt
            output_path: Path for encrypted file (auto-generated if None)
        
        Returns:
            str: Path to encrypted file
        """
        if not ENCRYPTION_AVAILABLE:
            print("Warning: Encryption not available. File not encrypted.")
            return input_path
        
        api_key, subscription_id = self._get_upload_credentials()
        if not api_key or not subscription_id:
            print("Warning: No credentials available for encryption. File not encrypted.")
            return input_path
        
        if not self.get_sync_setting('encrypt_backups', True):
            return input_path
        
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                return input_path
            
            if output_path is None:
                output_path = str(input_file.parent / f"{input_file.stem}.encrypted{input_file.suffix}")
            
            # Generate encryption key
            key, salt = self._derive_encryption_key(api_key, subscription_id)
            
            # Generate IV
            iv = os.urandom(16)
            
            # Read file data
            with open(input_path, 'rb') as f:
                plaintext = f.read()
            
            # Encrypt
            cipher = Cipher(
                algorithms.AES(key),
                modes.CBC(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            # Add padding
            padding_length = 16 - (len(plaintext) % 16)
            padded_plaintext = plaintext + bytes([padding_length] * padding_length)
            
            ciphertext = encryptor.update(padded_plaintext) + encryptor.finalize()
            
            # Write encrypted file: [salt(32)][iv(16)][ciphertext]
            with open(output_path, 'wb') as f:
                f.write(salt)
                f.write(iv)
                f.write(ciphertext)
            
            return output_path
            
        except Exception as e:
            print(f"Error encrypting file: {e}")
            return input_path
    
    def _decrypt_file(self, input_path: str, output_path: str = None) -> str:
        """
        Decrypt an encrypted backup file
        
        Args:
            input_path: Path to encrypted file
            output_path: Path for decrypted file (auto-generated if None)
        
        Returns:
            str: Path to decrypted file
        """
        if not ENCRYPTION_AVAILABLE:
            print("Warning: Encryption not available. Assuming file is not encrypted.")
            return input_path
        
        api_key, subscription_id = self._get_upload_credentials()
        if not api_key or not subscription_id:
            print("Warning: No credentials available for decryption.")
            return input_path
        
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                return input_path
            
            if output_path is None:
                output_path = str(input_file.parent / f"{input_file.stem}.decrypted{input_file.suffix}")
                if '.encrypted' in str(input_file):
                    output_path = str(input_file).replace('.encrypted', '')
            
            # Read encrypted file
            with open(input_path, 'rb') as f:
                salt = f.read(32)
                iv = f.read(16)
                ciphertext = f.read()
            
            # Check if file is actually encrypted (has proper header)
            if len(salt) != 32 or len(iv) != 16:
                print("Warning: File does not appear to be encrypted. Copying as-is.")
                if input_path != output_path:
                    shutil.copy2(input_path, output_path)
                return output_path
            
            # Derive decryption key
            key, _ = self._derive_encryption_key(api_key, subscription_id, salt)
            
            # Decrypt
            cipher = Cipher(
                algorithms.AES(key),
                modes.CBC(iv),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            # Remove padding
            padding_length = padded_plaintext[-1]
            plaintext = padded_plaintext[:-padding_length]
            
            # Write decrypted file
            with open(output_path, 'wb') as f:
                f.write(plaintext)
            
            return output_path
            
        except Exception as e:
            print(f"Error decrypting file: {e}")
            return input_path
    
    def _load_config(self) -> dict:
        """Load backup configuration from file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    # Validate paths exist or create them
                    for key in ['backup_location1', 'backup_location2']:
                        if key in config and config[key]:
                            loc = Path(config[key])
                            loc.mkdir(parents=True, exist_ok=True)
                    return config
            except Exception:
                pass
        
        # Default config
        return {
            'backup_location1': str(self.default_backup_dir1),
            'backup_location2': str(self.default_backup_dir2),
            'auto_sync_enabled': True,
            'encrypt_backups': True,
            'max_retry_count': 3,
        }
    
    def _save_config(self):
        """Save backup configuration to file"""
        try:
            # Create directories if they don't exist
            for key in ['backup_location1', 'backup_location2']:
                if key in self.config and self.config[key]:
                    Path(self.config[key]).mkdir(parents=True, exist_ok=True)
            
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"Error saving backup config: {e}")
    
    def get_sync_setting(self, key: str, default=None):
        """Get a sync setting value"""
        return self.config.get(key, default)
    
    def set_sync_setting(self, key: str, value) -> bool:
        """Set a sync setting value"""
        try:
            self.config[key] = value
            self._save_config()
            return True
        except Exception as e:
            print(f"Error setting sync setting: {e}")
            return False
    
    def get_last_sync_time(self) -> str:
        """Get the last successful sync time"""
        return self.config.get('last_sync_time', 'Never')
    
    def _update_last_sync_time(self):
        """Update last sync timestamp"""
        self.config['last_sync_time'] = datetime.now().isoformat()
        self._save_config()

    def _load_json_file(self, file_path: Path) -> dict:
        if not file_path.exists():
            return {}
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def _save_json_file(self, file_path: Path, data) -> None:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def _get_device_fingerprint(self) -> str:
        """Get device fingerprint for config decryption"""
        import platform
        import uuid
        import hashlib
        raw = '|'.join([platform.node(), platform.machine(), str(uuid.getnode())])
        return hashlib.sha256(raw.encode()).hexdigest()[:32]
    
    def _decrypt_config_value(self, value: str, device_fp: str) -> str:
        """Decrypt an encrypted config value"""
        if not value:
            return ''
        try:
            import base64
            import hashlib
            
            def xor_bytes(data, key_material):
                key = hashlib.sha256(key_material.encode()).digest()
                return bytes(byte ^ key[index % len(key)] for index, byte in enumerate(data))
            
            decoded = base64.b64decode(value.encode('utf-8'))
            decrypted = xor_bytes(decoded, f'config:{device_fp}')
            return decrypted.decode('utf-8')
        except Exception:
            return value
    
    def _resolve_server_api_url(self) -> str:
        env_url = (os.getenv('ZORO9X_PUBLIC_API_URL') or '').strip()
        if env_url.startswith('http://') or env_url.startswith('https://'):
            return env_url.rstrip('/')

        if self.server_api_url_file.exists():
            try:
                file_url = self.server_api_url_file.read_text(encoding='utf-8').strip()
                if file_url.startswith('http://') or file_url.startswith('https://'):
                    return file_url.rstrip('/')
            except Exception:
                pass

        return 'https://www.zoro9x.com'

    def _get_upload_credentials(self):
        config = self._load_json_file(self.app_config_file)
        cache = self._load_json_file(self.license_cache_file)

        device_fp = self._get_device_fingerprint()
        
        # Try to get encrypted api_key first, fallback to plain text
        api_key_encrypted = config.get('api_key_encrypted', '')
        if api_key_encrypted:
            api_key = self._decrypt_config_value(api_key_encrypted, device_fp).strip()
        else:
            api_key = (config.get('api_key') or '').strip()
        
        subscription_id = cache.get('subscription_id')

        print(f"Debug - Config file path: {self.app_config_file}")
        print(f"Debug - Config file exists: {self.app_config_file.exists()}")
        print(f"Debug - License cache path: {self.license_cache_file}")
        print(f"Debug - License cache exists: {self.license_cache_file.exists()}")
        print(f"Debug - Has encrypted API key: {bool(api_key_encrypted)}")
        print(f"Debug - API key present: {bool(api_key)}")
        print(f"Debug - API key length: {len(api_key) if api_key else 0}")
        print(f"Debug - Subscription ID: {subscription_id}")
        
        if not api_key or not subscription_id:
            return None, None

        return api_key, str(subscription_id)

    def _load_pending_uploads(self) -> list:
        data = self._load_json_file(self.pending_uploads_file)
        pending = data.get('pending_uploads', [])
        return pending if isinstance(pending, list) else []

    def _save_pending_uploads(self, pending_uploads: list) -> None:
        self._save_json_file(self.pending_uploads_file, {'pending_uploads': pending_uploads})

    def _queue_backup_upload(self, backup_path: str, backup_name: str = None, retry_count: int = 0) -> None:
        if not backup_path:
            return

        pending_uploads = self._load_pending_uploads()
        queued_name = backup_name or Path(backup_path).name
        
        # Check if already queued
        if any(item.get('backup_path') == backup_path for item in pending_uploads):
            return

        pending_uploads.append({
            'backup_path': backup_path,
            'backup_name': queued_name,
            'queued_at': datetime.now().isoformat(),
            'retry_count': retry_count,
            'last_error': None,
        })
        self._save_pending_uploads(pending_uploads)

    def _upload_backup_file(self, backup_path: str, backup_name: str = None, source: str = 'desktop', encrypt: bool = True) -> tuple[bool, str]:
        """
        Upload backup file to server
        Returns: (success, error_message)
        """
        api_key, subscription_id = self._get_upload_credentials()
        if not api_key or not subscription_id:
            error_details = []
            if not api_key:
                error_details.append(f"API key not found in {self.app_config_file.name}")
            if not subscription_id:
                error_details.append(f"Subscription ID not found in {self.license_cache_file.name}")
            return False, f"No API credentials configured\n\nMissing:\n" + "\n".join(error_details)

        backup_file = Path(backup_path)
        if not backup_file.exists():
            return False, f"Backup file not found: {backup_path}"

        api_url = self._resolve_server_api_url()
        upload_url = f"{api_url}/api/saas/subscriptions/{subscription_id}/backups/upload"

        try:
            # Encrypt if enabled
            upload_file_path = backup_path
            is_encrypted = False
            encrypt_enabled = self.get_sync_setting('encrypt_backups', True)
            
            print(f"Uploading backup: {backup_name or backup_file.name}")
            print(f"Encryption enabled: {encrypt_enabled}, ENCRYPTION_AVAILABLE: {ENCRYPTION_AVAILABLE}")
            
            if encrypt and encrypt_enabled and ENCRYPTION_AVAILABLE:
                print("Encrypting backup before upload...")
                encrypted_path = self._encrypt_file(backup_path)
                if encrypted_path and encrypted_path != backup_path:
                    upload_file_path = encrypted_path
                    is_encrypted = True
                    print(f"Backup encrypted: {encrypted_path}")
                else:
                    print("Encryption failed, uploading unencrypted")
            
            print(f"Uploading to: {upload_url}")
            print(f"Upload file size: {Path(upload_file_path).stat().st_size} bytes")
            
            with open(upload_file_path, 'rb') as file_handle:
                response = requests.post(
                    upload_url,
                    files={'backup_file': (backup_name or backup_file.name, file_handle, 'application/octet-stream')},
                    data={
                        'api_key': api_key,
                        'subscription_id': subscription_id,
                        'backup_name': backup_name or backup_file.name,
                        'source': source,
                        'is_encrypted': 'true' if is_encrypted else 'false',
                    },
                    timeout=60,  # Increased timeout for large files
                )
            
            print(f"Upload response status: {response.status_code}")
            print(f"Upload response: {response.text[:500]}")
            
            # Clean up encrypted temp file
            if is_encrypted and upload_file_path != backup_path:
                try:
                    Path(upload_file_path).unlink()
                    print("Cleaned up encrypted temp file")
                except Exception as e:
                    print(f"Failed to clean up temp file: {e}")
            
            if response.status_code == 200:
                result = response.json()
                success = bool(result.get('success'))
                if success:
                    self._update_last_sync_time()
                    print("Upload successful!")
                    return True, ""
                else:
                    error_msg = result.get('message', 'Unknown error')
                    print(f"Upload failed: {error_msg}")
                    return False, error_msg
            else:
                error_msg = f"Server returned status {response.status_code}"
                print(error_msg)
                return False, error_msg
            
        except requests.exceptions.Timeout:
            return False, "Upload timeout - file may be too large or connection slow"
        except requests.exceptions.ConnectionError:
            return False, "Cannot connect to server - check internet connection"
        except Exception as e:
            error_msg = f"Upload error: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return False, error_msg

    def sync_pending_uploads(self) -> tuple[int, list]:
        """
        Sync pending uploads with retry logic
        Returns: (uploaded_count, error_messages)
        """
        pending_uploads = self._load_pending_uploads()
        if not pending_uploads:
            return 0, []

        remaining = []
        uploaded_count = 0
        errors = []
        max_retries = self.get_sync_setting('max_retry_count', 3)

        for item in pending_uploads:
            backup_path = item.get('backup_path', '')
            backup_name = item.get('backup_name', '')
            retry_count = item.get('retry_count', 0)
            
            if not backup_path or not Path(backup_path).exists():
                errors.append(f"{backup_name}: File not found")
                continue
            
            # Skip if max retries exceeded but keep in queue
            if retry_count >= max_retries:
                errors.append(f"{backup_name}: Max retries exceeded")
                remaining.append(item)  # Keep in queue so user can retry manually
                continue

            result, error = self._upload_backup_file(backup_path, backup_name, source='queued')
            if result:
                uploaded_count += 1
            else:
                # Increment retry count and re-queue
                item['retry_count'] = retry_count + 1
                item['last_retry'] = datetime.now().isoformat()
                item['last_error'] = error or 'Upload failed'
                remaining.append(item)
                errors.append(f"{backup_name}: {error or 'Upload failed'}")

        self._save_pending_uploads(remaining)
        return uploaded_count, errors
    
    def reset_queue_retry_counts(self) -> int:
        """Reset retry counts for all queued items"""
        pending_uploads = self._load_pending_uploads()
        reset_count = 0
        
        for item in pending_uploads:
            if item.get('retry_count', 0) > 0:
                item['retry_count'] = 0
                item['last_error'] = ''
                reset_count += 1
        
        self._save_pending_uploads(pending_uploads)
        return reset_count
    
    def clear_old_queue_items(self, days: int = 30) -> int:
        """Clear queue items older than specified days"""
        pending_uploads = self._load_pending_uploads()
        if not pending_uploads:
            return 0
        
        cutoff = datetime.now().timestamp() - (days * 24 * 60 * 60)
        remaining = []
        cleared = 0
        
        for item in pending_uploads:
            try:
                queued_at = datetime.fromisoformat(item.get('queued_at', ''))
                if queued_at.timestamp() > cutoff:
                    remaining.append(item)
                else:
                    cleared += 1
            except Exception:
                remaining.append(item)
        
        self._save_pending_uploads(remaining)
        return cleared
    
    def get_queue_status(self) -> dict:
        """Get current queue status"""
        pending_uploads = self._load_pending_uploads()
        return {
            'total': len(pending_uploads),
            'items': pending_uploads,
        }
    
    def set_backup_locations(self, location1: str, location2: str) -> bool:
        """
        Set backup locations
        
        Args:
            location1: Primary backup location
            location2: Secondary backup location
        
        Returns:
            bool: True if successful
        """
        try:
            # Create directories if they don't exist
            Path(location1).mkdir(parents=True, exist_ok=True)
            Path(location2).mkdir(parents=True, exist_ok=True)
            
            self.config['backup_location1'] = location1
            self.config['backup_location2'] = location2
            self._save_config()
            return True
        except Exception as e:
            print(f"Error setting backup locations: {e}")
            return False
    
    def get_backup_locations(self) -> tuple:
        """Get configured backup locations"""
        loc1 = self.config.get('backup_location1', str(self.default_backup_dir1))
        loc2 = self.config.get('backup_location2', str(self.default_backup_dir2))
        return loc1, loc2
    
    def create_backup(self, backup_name: str = None) -> bool:
        """
        Create a backup of the database to both configured locations
        
        Args:
            backup_name: Custom backup name (optional). If not provided, uses timestamp
        
        Returns:
            bool: True if successful
        """
        try:
            if not self.db_full_path.exists():
                print(f"Database not found: {self.db_full_path}")
                return False
            
            # Create backup filename with timestamp
            if backup_name is None:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_name = f"backup_{timestamp}.db"
            elif not backup_name.endswith('.db'):
                backup_name += '.db'
            
            # Get backup locations
            loc1, loc2 = self.get_backup_locations()
            
            # Create backups in both locations
            created_any = False
            for loc_path in [loc1, loc2]:
                try:
                    Path(loc_path).mkdir(parents=True, exist_ok=True)
                    backup_file = Path(loc_path) / backup_name
                    shutil.copy2(str(self.db_full_path), str(backup_file))
                    self.last_backup_path = str(backup_file)
                    self.last_backup_name = backup_file.name
                    created_any = True
                except Exception as e:
                    print(f"Error creating backup in {loc_path}: {e}")
            
            return created_any
        except Exception as e:
            print(f"Error creating backup: {e}")
            return False

    def create_backup_and_queue(self, backup_name: str = None) -> bool:
        if not self.create_backup(backup_name):
            return False

        if self.last_backup_path:
            self._queue_backup_upload(self.last_backup_path, self.last_backup_name)

        return True

    def create_backup_and_upload(self, backup_name: str = None) -> bool:
        """Create backup and upload to server"""
        if not self.create_backup(backup_name):
            return False
        
        # Check if auto-sync is enabled
        if not self.get_sync_setting('auto_sync_enabled', True):
            if self.last_backup_path:
                self._queue_backup_upload(self.last_backup_path, self.last_backup_name)
            return True

        if self.last_backup_path and self._upload_backup_file(self.last_backup_path, self.last_backup_name):
            return True

        if self.last_backup_path:
            self._queue_backup_upload(self.last_backup_path, self.last_backup_name)

        return True
    
    def get_server_backups(self) -> list:
        """Get list of backups stored on server"""
        api_key, subscription_id = self._get_upload_credentials()
        if not api_key or not subscription_id:
            print("No upload credentials available")
            return []
        
        api_url = self._resolve_server_api_url()
        list_url = f"{api_url}/api/saas/subscriptions/{subscription_id}/backups"
        
        try:
            # Try without authentication first (for desktop app direct access)
            response = requests.get(
                list_url,
                headers={
                    'X-API-Key': api_key,
                    'X-Subscription-ID': str(subscription_id),
                },
                timeout=15,
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return data.get('backups', [])
                else:
                    print(f"Server returned error: {data.get('message')}")
                    return []
            else:
                print(f"Failed to get server backups: {response.status_code}")
                print(f"Response: {response.text[:200]}")
                return []
                
        except Exception as e:
            print(f"Error getting server backups: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def download_server_backup(self, backup_id: int, destination_path: str = None) -> str:
        """
        Download and decrypt a backup from server
        
        Args:
            backup_id: ID of the backup on server
            destination_path: Local path to save (auto-generated if None)
        
        Returns:
            str: Path to downloaded backup (empty string on failure)
        """
        api_key, subscription_id = self._get_upload_credentials()
        if not api_key or not subscription_id:
            return ''
        
        api_url = self._resolve_server_api_url()
        download_url = f"{api_url}/api/saas/subscriptions/{subscription_id}/backups/{backup_id}/download"
        
        try:
            response = requests.get(
                download_url,
                params={
                    'api_key': api_key,
                    'subscription_id': subscription_id,
                },
                timeout=60,
                stream=True,
            )
            
            if response.status_code != 200:
                print(f"Failed to download backup: {response.status_code}")
                return ''
            
            # Determine destination path
            if destination_path is None:
                loc1, _ = self.get_backup_locations()
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                destination_path = str(Path(loc1) / f"server_backup_{timestamp}.db")
            
            # Save encrypted file
            temp_path = destination_path + '.tmp'
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            # Check if file is encrypted (has encryption header)
            try:
                with open(temp_path, 'rb') as f:
                    header = f.read(48)  # salt(32) + iv(16)
                    if len(header) == 48:
                        # File appears encrypted, decrypt it
                        decrypted_path = self._decrypt_file(temp_path, destination_path)
                        # Remove temp file
                        try:
                            Path(temp_path).unlink()
                        except Exception:
                            pass
                        return decrypted_path
                    else:
                        # File is not encrypted, just rename
                        shutil.move(temp_path, destination_path)
                        return destination_path
            except Exception as e:
                print(f"Error processing downloaded backup: {e}")
                # Just move temp file to destination
                shutil.move(temp_path, destination_path)
                return destination_path
                
        except Exception as e:
            print(f"Error downloading server backup: {e}")
            return ''
    
    def get_backups(self, max_count: int = 20) -> list:
        """
        Get list of available backups from both locations (merged and deduplicated)
        
        Args:
            max_count: Maximum number of backups to return
        
        Returns:
            list: List of backup info dicts, sorted by date (newest first)
        """
        backups = {}
        loc1, loc2 = self.get_backup_locations()
        
        # Scan both locations
        for location in [loc1, loc2]:
            loc_path = Path(location)
            if not loc_path.exists():
                continue
            
            for backup_file in loc_path.glob('backup_*.db'):
                try:
                    stat = backup_file.stat()
                    # Use filename as key to deduplicate
                    filename = backup_file.name
                    if filename not in backups:
                        backups[filename] = {
                            'name': filename,
                            'size': stat.st_size,
                            'timestamp': stat.st_mtime,
                            'date': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                            'location': location,
                            'path': str(backup_file)
                        }
                except Exception as e:
                    print(f"Error reading backup info: {e}")
        
        # Sort by timestamp (newest first) and return top N
        sorted_backups = sorted(backups.values(), key=lambda x: x['timestamp'], reverse=True)
        return sorted_backups[:max_count]
    
    def restore_backup(self, backup_path: str) -> bool:
        """
        Restore database from a backup
        
        Args:
            backup_path: Full path to the backup file
        
        Returns:
            bool: True if successful
        """
        try:
            backup_file = Path(backup_path)
            if not backup_file.exists():
                print(f"Backup file not found: {backup_path}")
                return False
            
            # Close any open connections to the database
            # (This would need to be coordinated with the app)
            
            # Create a safety backup of current database
            current_backup = self.db_full_path.parent / f"backup_pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            if self.db_full_path.exists():
                shutil.copy2(str(self.db_full_path), str(current_backup))
            
            # Restore from backup
            shutil.copy2(str(backup_file), str(self.db_full_path))
            
            # Also update the backup files
            loc1, loc2 = self.get_backup_locations()
            for loc_path in [loc1, loc2]:
                try:
                    dest = Path(loc_path) / self.db_file
                    shutil.copy2(str(self.db_full_path), str(dest))
                except Exception as e:
                    print(f"Error updating backup location {loc_path}: {e}")
            
            return True
        except Exception as e:
            print(f"Error restoring backup: {e}")
            return False
    
    def delete_backup(self, backup_name: str) -> bool:
        """
        Delete a backup from both locations
        
        Args:
            backup_name: Name of the backup file
        
        Returns:
            bool: True if successful
        """
        try:
            loc1, loc2 = self.get_backup_locations()
            success = True
            
            for location in [loc1, loc2]:
                backup_file = Path(location) / backup_name
                if backup_file.exists():
                    try:
                        backup_file.unlink()
                    except Exception as e:
                        print(f"Error deleting backup from {location}: {e}")
                        success = False
            
            return success
        except Exception as e:
            print(f"Error deleting backup: {e}")
            return False
    
    def get_backup_size_formatted(self, size_bytes: int) -> str:
        """Format bytes to human readable size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"


# Global backup manager instance
_backup_manager = None


def get_backup_manager(db_path: str = None, db_file: str = 'gold_loan_basic_database.db') -> BackupManager:
    """Get or create the global backup manager instance."""
    global _backup_manager
    if _backup_manager is None:
        assert db_path is not None, "db_path must be provided on first call"
        _backup_manager = BackupManager(db_path, db_file=db_file)
        return _backup_manager

    if db_path is not None:
        req_path = str(Path(db_path).resolve())
        cur_path = str(_backup_manager.db_path.resolve())
        req_file = (db_file or '').strip() or _backup_manager.db_file
        if req_path != cur_path or req_file != _backup_manager.db_file:
            _backup_manager = BackupManager(db_path, db_file=req_file)

    return _backup_manager
