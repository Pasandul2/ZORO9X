import json
import os

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


def main():
    items = load_data()
    print('Simple Inventory System')
    print('1. Add item')
    print('2. List items')
    choice = input('Select option: ').strip()

    if choice == '1':
        add_item(items)
    elif choice == '2':
        list_items(items)
    else:
        print('Invalid option')


if __name__ == '__main__':
    main()
