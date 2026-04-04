# Sample System Project (Upload to SaaS Manager)

This is a simple Python inventory project you can package and upload as a product asset.

## Demo Features

- Welcome screen
- Clickable `Open Demo Project` button
- Clickable `Activate License` button (connects to license manager)
- Add inventory item from UI
- Refresh and list saved items
- Data persistence in `inventory_data.json`
- Qt5 UI (PyQt5)

## Install Qt5

```bash
pip install PyQt5
```

## Run (GUI Welcome Screen)

```bash
python main.py
```

Or explicitly:

```bash
python main.py --gui
```

## License-Connected Flow

1. Start backend license API.
2. Buy product from SaaS store and copy activation key.
3. Open sample app GUI.
4. Click `Activate License` and paste activation key.
5. Click `Open Demo Project`.
6. App opens only if license is valid.

## CLI Test Modes

List items:

```bash
python main.py --list
```

Add item:

```bash
python main.py --add "DemoItem" 3
```

Activate key from CLI:

```bash
python main.py --activate YOUR-ACTIVATION-KEY
```

## Build Windows EXE

1. Use a Windows machine.
2. Run `build/build_windows_exe.bat`.
3. Upload `dist/SimpleInventory.exe` from admin panel.

## SaaS Flow

1. Admin creates product in SaaS admin panel.
2. Admin uploads EXE or ZIP installer asset.
3. Customer purchases in store.
4. Customer gets activation key.
5. Customer uses dashboard download button (license verified).
6. Python license manager validates activation and runtime access.
