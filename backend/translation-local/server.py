import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import argostranslate.package
import argostranslate.settings
import argostranslate.translate
import requests


HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "5000"))
PACKAGE_PAIRS = [
    tuple(pair.strip().split("_", 1))
    for pair in os.getenv("ARGOS_PACKAGE_PAIRS", "en_ar,ar_en,en_ru,ru_en").split(",")
    if "_" in pair
]

READY = False
BOOT_ERROR = None


def installed_pairs():
    pairs = set()
    for language in argostranslate.translate.get_installed_languages():
        for translation in language.translations_from:
            pairs.add((language.code, translation.to_lang.code))
    return pairs


def ensure_packages():
    print("Refreshing Argos package index...", flush=True)
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    available_index = {
        (package.from_code, package.to_code): package
        for package in available_packages
    }

    current_pairs = installed_pairs()
    for pair in PACKAGE_PAIRS:
        if pair in current_pairs:
            print(f"Argos package already installed: {pair[0]}->{pair[1]}", flush=True)
            continue

        package = available_index.get(pair)
        if package is None:
            raise RuntimeError(f"Missing Argos package for pair {pair[0]}->{pair[1]}")

        print(f"Downloading Argos package: {pair[0]}->{pair[1]}", flush=True)
        download_path = download_package(package)
        print(f"Installing Argos package: {pair[0]}->{pair[1]}", flush=True)
        argostranslate.package.install_from_path(download_path)
        current_pairs = installed_pairs()


def download_package(package) -> Path:
    filename = f"{argostranslate.package.argospm_package_name(package)}.argosmodel"
    download_path = argostranslate.settings.downloads_dir / filename

    if download_path.exists():
        print(f"Reusing downloaded package: {download_path}", flush=True)
        return download_path

    last_error = None
    for link in package.links:
        if not str(link).startswith(("http://", "https://")):
            continue

        try:
            with requests.get(
                link,
                stream=True,
                timeout=120,
                headers={"User-Agent": "RafefTechLocalTranslate"},
            ) as response:
                response.raise_for_status()
                total_size = int(response.headers.get("content-length", "0") or "0")
                written = 0
                with open(download_path, "wb") as handle:
                    for chunk in response.iter_content(chunk_size=1024 * 256):
                        if not chunk:
                            continue

                        handle.write(chunk)
                        written += len(chunk)

                        if total_size > 0 and written % (5 * 1024 * 1024) < len(chunk):
                            print(
                                f"Download progress {package.from_code}->{package.to_code}: {written}/{total_size} bytes",
                                flush=True,
                            )

                return download_path
        except Exception as error:
            last_error = error
            if download_path.exists():
                download_path.unlink(missing_ok=True)
            print(f"Download attempt failed for {link}: {error}", flush=True)

    raise RuntimeError(f"Download failed for {package.from_code}->{package.to_code}: {last_error}")


def translate_text(text: str, source: str, target: str) -> str:
    return argostranslate.translate.translate(text, source, target)


class Handler(BaseHTTPRequestHandler):
    def _write_json(self, status_code: int, payload):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path == "/health":
            if READY:
                self._write_json(200, {"status": "ok", "ready": True})
            else:
                self._write_json(503, {"status": "booting", "ready": False, "error": BOOT_ERROR})
            return

        if self.path == "/languages":
            languages = [{"code": language.code, "name": language.name} for language in argostranslate.translate.get_installed_languages()]
            self._write_json(200, languages)
            return

        self._write_json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/translate":
            self._write_json(404, {"error": "not_found"})
            return

        if not READY:
            self._write_json(503, {"error": "service_not_ready", "details": BOOT_ERROR})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode("utf-8"))
            text = str(payload.get("q", "")).strip()
            source = str(payload.get("source", "")).strip()
            target = str(payload.get("target", "")).strip()

            if not text or not source or not target:
                self._write_json(400, {"error": "invalid_payload"})
                return

            translated_text = translate_text(text, source, target)
            self._write_json(200, {"translatedText": translated_text})
        except Exception as error:
            self._write_json(500, {"error": "translation_failed", "details": str(error)})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    try:
        ensure_packages()
        READY = True
        print(f"Local translation server ready on {HOST}:{PORT}", flush=True)
    except Exception as error:
        BOOT_ERROR = str(error)
        print(f"Local translation bootstrap failed: {BOOT_ERROR}", flush=True)

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.serve_forever()
