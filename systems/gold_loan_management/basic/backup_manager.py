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
        self.default_backup_dir1 = self.db_path / 'backups'
        self.default_backup_dir2 = self.db_path / 'backups_cloud'
        
        # Load or create backup config
        self.config = self._load_config()
    
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
            success = True
            for loc_path in [loc1, loc2]:
                try:
                    Path(loc_path).mkdir(parents=True, exist_ok=True)
                    backup_file = Path(loc_path) / backup_name
                    shutil.copy2(str(self.db_full_path), str(backup_file))
                except Exception as e:
                    print(f"Error creating backup in {loc_path}: {e}")
                    success = False
            
            return success
        except Exception as e:
            print(f"Error creating backup: {e}")
            return False
    
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


def get_backup_manager(db_path: str = None) -> BackupManager:
    """Get or create the global backup manager instance"""
    global _backup_manager
    if _backup_manager is None:
        assert db_path is not None, "db_path must be provided on first call"
        _backup_manager = BackupManager(db_path)
    return _backup_manager
