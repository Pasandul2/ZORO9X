"""
Database Sync Module for Client Systems
Auto-syncs local database with remote server backup
"""

import json
import sqlite3
import requests
import threading
import time
from datetime import datetime

class DatabaseSync:
    def __init__(self, config_file='business_config.json'):
        """Initialize database sync with configuration"""
        self.config = self.load_config(config_file)
        self.api_key = self.config.get('api_key', '')
        self.sync_url = self.config.get('database_config', {}).get('sync_url', '')
        self.remote_db_name = self.config.get('database_config', {}).get('remote_database_name', '')
        self.sync_enabled = self.config.get('database_config', {}).get('sync_enabled', False)
        self.local_db = None
        self.sync_interval = 300  # Sync every 5 minutes
        self.sync_thread = None
        self.running = False
        
    def load_config(self, config_file):
        """Load business configuration"""
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            return {}
    
    def connect_local_db(self, db_path):
        """Connect to local SQLite database"""
        try:
            self.local_db = sqlite3.connect(db_path, check_same_thread=False)
            self.local_db.row_factory = sqlite3.Row
            return True
        except Exception as e:
            print(f"Error connecting to local database: {e}")
            return False
    
    def sync_table_to_server(self, table_name, row_data):
        """Sync a single row to server"""
        if not self.sync_enabled or not self.sync_url or not self.api_key:
            return False
        
        try:
            # Convert row to dictionary
            if isinstance(row_data, sqlite3.Row):
                row_dict = dict(zip(row_data.keys(), row_data))
            else:
                row_dict = row_data
            
            # Send to server
            response = requests.post(
                f"{self.sync_url}/to-server",
                json={
                    'api_key': self.api_key,
                    'table_name': table_name,
                    'data': row_dict
                },
                timeout=10
            )
            
            if response.status_code == 200:
                return True
            else:
                print(f"Sync failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Error syncing to server: {e}")
            return False
    
    def sync_table_from_server(self, table_name, where_clause=None):
        """Restore table data from server"""
        if not self.sync_enabled or not self.sync_url or not self.api_key:
            return []
        
        try:
            response = requests.post(
                f"{self.sync_url}/from-server",
                json={
                    'api_key': self.api_key,
                    'table_name': table_name,
                    'where_clause': where_clause or {}
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('data', [])
            else:
                print(f"Restore failed: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"Error restoring from server: {e}")
            return []
    
    def get_remote_tables(self):
        """Get list of tables from remote database"""
        if not self.sync_enabled or not self.sync_url or not self.api_key:
            return []
        
        try:
            response = requests.get(
                f"{self.sync_url}/tables",
                params={'api_key': self.api_key},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('tables', [])
            else:
                return []
                
        except Exception as e:
            print(f"Error getting remote tables: {e}")
            return []
    
    def auto_sync_all_tables(self):
        """Automatically sync all tables in local database"""
        if not self.local_db or not self.sync_enabled:
            return
        
        try:
            cursor = self.local_db.cursor()
            
            # Get all tables from local database
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            synced_count = 0
            for table in tables:
                table_name = table[0]
                
                # Skip sqlite internal tables
                if table_name.startswith('sqlite_'):
                    continue
                
                # Get all rows from table
                cursor.execute(f"SELECT * FROM {table_name}")
                rows = cursor.fetchall()
                
                # Sync each row
                for row in rows:
                    if self.sync_table_to_server(table_name, row):
                        synced_count += 1
            
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Auto-sync completed: {synced_count} records synced")
            
        except Exception as e:
            print(f"Error in auto-sync: {e}")
    
    def restore_all_from_server(self):
        """Restore all data from server to local database"""
        if not self.local_db or not self.sync_enabled:
            return False
        
        try:
            # Get remote tables
            remote_tables = self.get_remote_tables()
            
            if not remote_tables:
                print("No remote tables found")
                return False
            
            cursor = self.local_db.cursor()
            restored_count = 0
            
            for table_name in remote_tables:
                # Get data from server
                rows = self.sync_table_from_server(table_name)
                
                if not rows:
                    continue
                
                # Insert into local database
                for row in rows:
                    try:
                        columns = ', '.join(row.keys())
                        placeholders = ', '.join(['?' for _ in row.keys()])
                        values = list(row.values())
                        
                        sql = f"INSERT OR REPLACE INTO {table_name} ({columns}) VALUES ({placeholders})"
                        cursor.execute(sql, values)
                        restored_count += 1
                        
                    except Exception as e:
                        print(f"Error inserting row into {table_name}: {e}")
                        continue
            
            self.local_db.commit()
            print(f"Restored {restored_count} records from server")
            return True
            
        except Exception as e:
            print(f"Error restoring from server: {e}")
            return False
    
    def start_background_sync(self):
        """Start background sync thread"""
        if self.running:
            return
        
        self.running = True
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()
        print("Background sync started")
    
    def stop_background_sync(self):
        """Stop background sync thread"""
        self.running = False
        if self.sync_thread:
            self.sync_thread.join()
        print("Background sync stopped")
    
    def _sync_loop(self):
        """Background sync loop"""
        while self.running:
            try:
                self.auto_sync_all_tables()
            except Exception as e:
                print(f"Error in sync loop: {e}")
            
            # Wait for next sync interval
            for _ in range(self.sync_interval):
                if not self.running:
                    break
                time.sleep(1)


# Example usage:
if __name__ == "__main__":
    # Initialize sync
    sync = DatabaseSync('business_config.json')
    
    # Connect to local database
    sync.connect_local_db('gym_data.db')
    
    # Option 1: Manual sync
    # sync.auto_sync_all_tables()
    
    # Option 2: Restore from server
    # sync.restore_all_from_server()
    
    # Option 3: Start background sync
    sync.start_background_sync()
    
    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sync.stop_background_sync()
        print("Sync stopped")
