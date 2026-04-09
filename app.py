from flask import Flask, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

app = Flask(__name__)

# ---------------- SETUP SELENIUM ----------------
def create_driver():
    options = Options()
    options.add_argument("--headless")  # run in background
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver

# ---------------- HOME ----------------
@app.route("/")
def home():
    return "🔥 FitGirl ULTIMATE Scraper Running!"

# ---------------- SEARCH ----------------
@app.route("/search")
def search():
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify({"error": "No query"}), 400

    driver = create_driver()

    try:
        url = f"https://fitgirl-repacks.site/?s={query}"
        driver.get(url)
        time.sleep(3)

        soup = BeautifulSoup(driver.page_source, "html.parser")

        results = []
        posts = soup.select("article .entry-title a")

        for post in posts:
            title = post.get_text().strip()
            link = post.get("href")

            results.append({
                "name": title,
                "link": link
            })

        driver.quit()
        return jsonify(results)

    except Exception as e:
        driver.quit()
        return jsonify({"error": str(e)}), 500


# ---------------- DOWNLOAD (FuckingFast) ----------------
@app.route("/download")
def download():
    link = request.args.get("url")

    if not link:
        return jsonify({"error": "No URL provided"}), 400

    driver = create_driver()

    try:
        driver.get(link)
        time.sleep(5)

        # Try clicking "FuckingFast" buttons
        buttons = driver.find_elements(By.XPATH, "//button[contains(., 'FuckingFast')]")

        for btn in buttons:
            try:
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(2)
            except:
                pass

        # Scroll to load everything
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)

        soup = BeautifulSoup(driver.page_source, "html.parser")

        downloads = set()

        for a in soup.find_all("a", href=True):
            href = a["href"]

            if "fuckingfast.co" in href.lower() or ".rar" in href.lower():
                downloads.add(href)

        driver.quit()

        return jsonify({
            "count": len(downloads),
            "downloads": list(downloads)
        })

    except Exception as e:
        driver.quit()
        return jsonify({"error": str(e)}), 500


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)