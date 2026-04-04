import json
import os
import sys
from PyQt5.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
    QInputDialog,
)
from license_bridge import activate_license_key, run_startup_guard

DATA_FILE = 'inventory_data.json'


def load_data():
    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE, 'r', encoding='utf-8') as file:
        return json.load(file)


def save_data(items):
    with open(DATA_FILE, 'w', encoding='utf-8') as file:
        json.dump(items, file, indent=2)


def add_item(items):
    name = input('Item name: ').strip()
    qty = int(input('Quantity: ').strip())
    items.append({'name': name, 'qty': qty})
    save_data(items)
    print('Item added')


def list_items(items):
    if not items:
        print('No items yet')
        return

    for index, item in enumerate(items, start=1):
        print(f"{index}. {item['name']} - qty: {item['qty']}")


class InventoryDemoApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Simple Inventory Demo (Qt5)')
        self.resize(620, 460)
        self.items = load_data()

        self.stack = QStackedWidget()
        self.setCentralWidget(self.stack)

        self.welcome_page = self._build_welcome_page()
        self.main_page = self._build_main_page()

        self.stack.addWidget(self.welcome_page)
        self.stack.addWidget(self.main_page)
        self.show_welcome()

    def _build_welcome_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.addStretch(1)

        title = QLabel('Welcome to Simple Inventory Demo')
        title.setStyleSheet('font-size: 24px; font-weight: 700;')
        subtitle = QLabel('Activate license, then open the demo project.')
        subtitle.setStyleSheet('font-size: 14px;')

        self.license_status = QLabel('License status: Not checked')
        self.license_status.setStyleSheet('font-size: 12px; color: #2563eb;')

        activate_btn = QPushButton('Activate License')
        activate_btn.clicked.connect(self.activate_license)
        activate_btn.setMinimumHeight(42)

        button = QPushButton('Open Demo Project')
        button.clicked.connect(self.open_demo_with_license_check)
        button.setMinimumHeight(44)

        layout.addWidget(title)
        layout.addWidget(subtitle)
        layout.addWidget(self.license_status)
        layout.addSpacing(18)
        layout.addWidget(activate_btn)
        layout.addWidget(button)
        layout.addStretch(2)
        return page

    def _build_main_page(self):
        page = QWidget()
        root = QVBoxLayout(page)

        form_layout = QHBoxLayout()
        self.name_entry = QLineEdit()
        self.name_entry.setPlaceholderText('Item name')
        self.qty_entry = QLineEdit()
        self.qty_entry.setPlaceholderText('Quantity')

        add_btn = QPushButton('Add Item')
        add_btn.clicked.connect(self.add_item_gui)
        back_btn = QPushButton('Back to Welcome')
        back_btn.clicked.connect(self.show_welcome)

        form_layout.addWidget(self.name_entry, 3)
        form_layout.addWidget(self.qty_entry, 1)
        form_layout.addWidget(add_btn)
        form_layout.addWidget(back_btn)

        self.list_widget = QListWidget()
        refresh_btn = QPushButton('Refresh List')
        refresh_btn.clicked.connect(self.refresh_list)

        root.addLayout(form_layout)
        root.addWidget(QLabel('Inventory Items'))
        root.addWidget(self.list_widget)
        root.addWidget(refresh_btn)

        return page

    def show_welcome(self):
        self.stack.setCurrentWidget(self.welcome_page)

    def show_main(self):
        self.stack.setCurrentWidget(self.main_page)
        self.refresh_list()

    def open_demo_with_license_check(self):
        guard = run_startup_guard()
        if not guard.get('allowed'):
            self.license_status.setText(f"License status: Blocked - {guard.get('reason', 'Unknown reason')}")
            QMessageBox.warning(self, 'Access Blocked', guard.get('reason', 'License check failed.'))
            return

        self.license_status.setText('License status: Active')
        self.show_main()

    def activate_license(self):
        key, ok = QInputDialog.getText(self, 'Activate License', 'Enter activation key:')
        if not ok or not key.strip():
            return

        try:
            state = activate_license_key(key.strip())
            self.license_status.setText(f"License status: Active until {state['expires_at']}")
            QMessageBox.information(self, 'Activation Success', 'License activated successfully.')
        except Exception as error:
            self.license_status.setText('License status: Activation failed')
            QMessageBox.critical(self, 'Activation Failed', str(error))

    def add_item_gui(self):
        name = self.name_entry.text().strip()
        qty_raw = self.qty_entry.text().strip()

        if not name:
            QMessageBox.critical(self, 'Validation Error', 'Item name is required.')
            return

        try:
            qty = int(qty_raw)
            if qty < 0:
                raise ValueError('negative')
        except ValueError:
            QMessageBox.critical(self, 'Validation Error', 'Quantity must be a non-negative integer.')
            return

        self.items.append({'name': name, 'qty': qty})
        save_data(self.items)
        self.name_entry.clear()
        self.qty_entry.clear()
        self.refresh_list()
        QMessageBox.information(self, 'Success', 'Item added successfully.')

    def refresh_list(self):
        self.items = load_data()
        self.list_widget.clear()

        if not self.items:
            self.list_widget.addItem('No items yet')
            return

        for index, item in enumerate(self.items, start=1):
            self.list_widget.addItem(f"{index}. {item['name']} - qty: {item['qty']}")


def run_gui():
    app = QApplication(sys.argv)
    window = InventoryDemoApp()
    window.show()
    app.exec_()


def main():
    args = sys.argv[1:]
    items = load_data()

    if args and args[0] == '--gui':
        run_gui()
        return

    if args and args[0] == '--list':
        list_items(items)
        return

    if len(args) >= 3 and args[0] == '--add':
        name = args[1]
        qty = int(args[2])
        items.append({'name': name, 'qty': qty})
        save_data(items)
        print('Item added')
        return

    if len(args) >= 2 and args[0] == '--activate':
        try:
            result = activate_license_key(args[1])
            print(f"Activation successful. Expires at: {result['expires_at']}")
        except Exception as error:
            print(f"Activation failed: {error}")
        return

    # Default mode opens demo GUI with welcome button.
    run_gui()


if __name__ == '__main__':
    main()
