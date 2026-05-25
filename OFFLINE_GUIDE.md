# Mezz Canteen Offline Setup Guide 🍖
Welcome to your offline canteen management platform! This guide helps you download, set up, and run Mezz Canteen locally on any computer—completely without the internet.

---

## 🚀 Setup Steps for the End User (Easy Model)

Follow these simple steps to run the application on your computer:

### Step 1: Install Node.js (Only Done Once)
Mezz Canteen runs as a secure local server directly on your desktop. To power this, you need a free utility called **Node.js**.
1. Go to [https://nodejs.org](https://nodejs.org) on a computer with internet access.
2. Download the recommended version labeled **"LTS"** (Long Term Support).
3. Open the downloaded file and click **Next** through the setup prompts to install it.

### Step 2: Download Your Mezz Canteen Folder
1. Download this project as a **ZIP file** (either from Google Drive or directly exported from AI Studio / GitHub).
2. Extract (Unzip) the folder onto your local hard drive (for example, on your Desktop or in your Documents folder).

### Step 3: Start the Application!
We have created automatic double-clickable files so you don't need to type any command lines.

#### ❖ If you are on Windows:
1. Double-click the file named **`run-app.bat`**.
2. **First Time Run Only:** If you are connected to the internet, it will automatically download its interior packages/files (this takes about 1-2 minutes).
3. The launcher will automatically compile the system and open your web browser to: **`http://localhost:3000`**
4. Keep the black terminal window open while you work. When finished, you can simply close it!

#### ❖ If you are on MacOS / Linux:
1. Open your terminal app, navigate to the folder, and give the launcher run permission by typing:
   `chmod +x run-app.sh`
2. Run it by double-clicking **`run-app.sh`** or typing:
   `./run-app.sh`
3. Your browser will automatically launch and open the canteen dashboard.

---

## 💾 Local Data & Offline Backups

- **Local Storage File:** All details of your employees, meal logs, expenses, and budgets are written securely into a simple local file inside the folder at `data/db.json`. 
- **Offline Reliability:** Once the very first-time packages are installed, you **never** need an internet connection to use the app. It reads and writes directly to your local computer's drive!
- **Data Safety Backup:** You can download a manual `.json` copy of your data file at any time from the **"Database Backup"** screen on the sidebar. This allows you to migrate databases from one laptop to another in 1 second!
