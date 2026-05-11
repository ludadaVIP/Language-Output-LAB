from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import shutil
import unicodedata
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_from_directory


ROOT = Path(__file__).resolve().parent
TOPICS_DIR = ROOT / "data" / "topics"
AUDIO_DIR = ROOT / "data" / "audio"
FRONTEND_DIST = ROOT / "frontend" / "dist"
TOPIC_ID_RE = re.compile(r"^[a-z0-9-]+$")

SUPPORTED_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
LANGUAGE_ORDER = ["en", "es", "fr", "de"]
SKILL_ORDER = ["speaking", "writing"]

SUPPORTED_LANGUAGES: dict[str, dict[str, Any]] = {
    "en": {
        "name": "English",
        "nameZh": "英语",
        "promptName": "English",
        "voices": [
            {
                "id": "en-US-JennyNeural",
                "name": "Jenny",
                "gender": "Female",
                "style": "Friendly, clear, general practice",
            },
            {
                "id": "en-US-AriaNeural",
                "name": "Aria",
                "gender": "Female",
                "style": "Confident, polished, story/news-like",
            },
            {
                "id": "en-US-GuyNeural",
                "name": "Guy",
                "gender": "Male",
                "style": "Warm, steady, expressive",
            },
        ],
    },
    "es": {
        "name": "Spanish",
        "nameZh": "西班牙语",
        "promptName": "Spanish",
        "voices": [
            {
                "id": "es-ES-ElviraNeural",
                "name": "Elvira",
                "gender": "Female",
                "style": "Spain Spanish, friendly, natural",
            },
            {
                "id": "es-ES-XimenaNeural",
                "name": "Ximena",
                "gender": "Female",
                "style": "Spanish, smooth, friendly",
            },
            {
                "id": "es-ES-AlvaroNeural",
                "name": "Alvaro",
                "gender": "Male",
                "style": "Spain Spanish, clear, warm",
            },
        ],
    },
    "fr": {
        "name": "French",
        "nameZh": "法语",
        "promptName": "French",
        "voices": [
            {
                "id": "fr-FR-VivienneMultilingualNeural",
                "name": "Vivienne",
                "gender": "Female",
                "style": "France French, friendly, very smooth",
            },
            {
                "id": "fr-FR-DeniseNeural",
                "name": "Denise",
                "gender": "Female",
                "style": "France French, friendly, general practice",
            },
            {
                "id": "fr-FR-HenriNeural",
                "name": "Henri",
                "gender": "Male",
                "style": "France French, calm, clear",
            },
        ],
    },
    "de": {
        "name": "German",
        "nameZh": "德语",
        "promptName": "German",
        "voices": [
            {
                "id": "de-DE-SeraphinaMultilingualNeural",
                "name": "Seraphina",
                "gender": "Female",
                "style": "Germany German, friendly, very smooth",
            },
            {
                "id": "de-DE-KatjaNeural",
                "name": "Katja",
                "gender": "Female",
                "style": "Germany German, friendly, general practice",
            },
            {
                "id": "de-DE-ConradNeural",
                "name": "Conrad",
                "gender": "Male",
                "style": "Germany German, calm, clear",
            },
        ],
    },
}

SKILLS = {
    "speaking": {"label": "Speaking", "labelZh": "口语"},
    "writing": {"label": "Writing", "labelZh": "写作"},
}

LANGUAGE_ALIASES = {
    "english": "en",
    "eng": "en",
    "en-us": "en",
    "en-gb": "en",
    "英语": "en",
    "spanish": "es",
    "espanol": "es",
    "español": "es",
    "spa": "es",
    "es-es": "es",
    "西语": "es",
    "西班牙语": "es",
    "french": "fr",
    "francais": "fr",
    "français": "fr",
    "fra": "fr",
    "fr-fr": "fr",
    "法语": "fr",
    "german": "de",
    "deutsch": "de",
    "ger": "de",
    "de-de": "de",
    "德语": "de",
}

SKILL_ALIASES = {
    "speaking": "speaking",
    "speak": "speaking",
    "spoken": "speaking",
    "oral": "speaking",
    "口语": "speaking",
    "writing": "writing",
    "write": "writing",
    "written": "writing",
    "composition": "writing",
    "写作": "writing",
}

ALLOWED_VOICES = {
    voice["id"]
    for language in SUPPORTED_LANGUAGES.values()
    for voice in language["voices"]
}

app = Flask(__name__)


def ensure_dirs() -> None:
    TOPICS_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify(value: Any, fallback: str = "topic") -> str:
    text = str(value or "").strip().lower()
    without_accents = "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )
    slug = re.sub(r"[^a-z0-9]+", "-", without_accents).strip("-")
    return slug or fallback


def normalise_language(value: Any, default: str = "es") -> str:
    text = str(value or "").strip().lower()
    if not text:
        return default
    if text in SUPPORTED_LANGUAGES:
        return text
    return LANGUAGE_ALIASES.get(re.sub(r"\s+", "-", text), default)


def normalise_skill(value: Any, default: str = "writing") -> str:
    text = str(value or "").strip().lower()
    if not text:
        return default
    return SKILL_ALIASES.get(re.sub(r"\s+", "-", text), default)


def normalise_level(value: Any) -> str:
    return str(value or "").strip().upper().replace(" ", "")


def voice_for_language_gender(language: Any, gender: Any) -> str:
    code = normalise_language(language)
    requested = str(gender or "female").strip().lower()
    target = "male" if requested in {"male", "m", "man", "男", "男声"} else "female"
    for voice in SUPPORTED_LANGUAGES[code]["voices"]:
        if voice["gender"].lower() == target:
            return voice["id"]
    return SUPPORTED_LANGUAGES[code]["voices"][0]["id"]


def topic_dir(language: Any, skill: Any) -> Path:
    return TOPICS_DIR / normalise_language(language) / normalise_skill(skill)


def topic_path(language: Any, skill: Any, topic_id: str) -> Path:
    if not TOPIC_ID_RE.match(topic_id):
        raise ValueError("Topic id may contain only lowercase letters, numbers, and hyphens.")
    return topic_dir(language, skill) / f"{topic_id}.json"


def topic_files(language: str | None = None, skill: str | None = None) -> list[Path]:
    ensure_dirs()
    if language and skill:
        base = topic_dir(language, skill)
        return sorted(base.glob("*.json")) if base.exists() else []
    return sorted(TOPICS_DIR.glob("*/*/*.json"))


def topic_audio_dir(language: Any, skill: Any, topic_id: str) -> Path:
    return AUDIO_DIR / "topics" / normalise_language(language) / normalise_skill(skill) / topic_id


def word_count(text: Any) -> int:
    return len([word for word in str(text or "").strip().split() if word])


def coerce_order(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def normalise_examples(raw_topic: dict[str, Any]) -> list[dict[str, Any]]:
    examples: list[dict[str, Any]] = []
    raw_examples = raw_topic.get("examples")

    if isinstance(raw_examples, list):
        source = raw_examples
    elif isinstance(raw_examples, dict):
        source = []
        for level, value in raw_examples.items():
            if isinstance(value, dict):
                source.append({"level": level, **value})
            else:
                source.append({"level": level, "body": value})
    else:
        source = []

    for item in source:
        if not isinstance(item, dict):
            continue
        level = normalise_level(item.get("level"))
        body = str(item.get("body") or item.get("text") or item.get("content") or "").strip()
        if not level or not body:
            continue
        examples.append(
            {
                "level": level,
                "title": str(item.get("title") or f"{level} model").strip(),
                "body": body,
                "notes": str(item.get("notes") or "").strip(),
                "wordCount": word_count(body),
            }
        )

    for level in SUPPORTED_LEVELS:
        key = level.lower()
        body = str(raw_topic.get(key) or "").strip()
        if not body:
            continue
        title = str(raw_topic.get(f"{key}Title") or raw_topic.get(f"{key}_title") or f"{level} model").strip()
        examples.append({"level": level, "title": title, "body": body, "notes": "", "wordCount": word_count(body)})

    seen: set[str] = set()
    unique_examples: list[dict[str, Any]] = []
    for example in examples:
        if example["level"] in seen:
            continue
        seen.add(example["level"])
        unique_examples.append(example)

    return sorted(unique_examples, key=lambda item: SUPPORTED_LEVELS.index(item["level"]) if item["level"] in SUPPORTED_LEVELS else 99)


def normalise_topic(raw_topic: dict[str, Any], fallback_language: str = "es", fallback_skill: str = "writing") -> dict[str, Any]:
    if not isinstance(raw_topic, dict):
        raise ValueError("Each imported topic must be a JSON object.")
    language = normalise_language(raw_topic.get("language") or raw_topic.get("targetLanguage"), fallback_language)
    skill = normalise_skill(raw_topic.get("skill") or raw_topic.get("mode") or raw_topic.get("practiceType"), fallback_skill)
    title = str(raw_topic.get("title") or "").strip()
    prompt = str(raw_topic.get("prompt") or raw_topic.get("task") or "").strip()
    topic_id = slugify(raw_topic.get("id") or title)
    if not title:
        raise ValueError("Topic title is required.")
    if not prompt:
        raise ValueError(f'Topic "{title}" needs a prompt.')
    if not TOPIC_ID_RE.match(topic_id):
        raise ValueError(f'Topic id "{topic_id}" is not valid.')

    examples = normalise_examples(raw_topic)
    levels = [example["level"] for example in examples]
    level_range = raw_topic.get("levelRange") or raw_topic.get("level_range") or raw_topic.get("level") or " / ".join(levels)
    if isinstance(level_range, list):
        level_range = " - ".join(str(item) for item in level_range)

    return {
        "id": topic_id,
        "language": language,
        "skill": skill,
        "order": coerce_order(raw_topic.get("order")),
        "category": str(raw_topic.get("category") or raw_topic.get("theme") or "General").strip(),
        "title": title,
        "prompt": prompt,
        "format": str(raw_topic.get("format") or raw_topic.get("genre") or "").strip(),
        "levelRange": str(level_range or "").strip(),
        "levels": levels,
        "examples": examples,
        "tags": raw_topic.get("tags") if isinstance(raw_topic.get("tags"), list) else [],
        "coreTakeaway": str(raw_topic.get("coreTakeaway") or raw_topic.get("core_takeaway") or "").strip(),
        "updatedAt": raw_topic.get("updatedAt") or datetime.now(timezone.utc).isoformat(),
    }


def public_topic(raw_topic: dict[str, Any]) -> dict[str, Any]:
    topic = normalise_topic(raw_topic, raw_topic.get("language", "es"), raw_topic.get("skill", "writing"))
    return topic


def topic_summary(topic: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": topic["id"],
        "language": topic["language"],
        "skill": topic["skill"],
        "order": topic.get("order", 0),
        "category": topic.get("category", "General"),
        "title": topic["title"],
        "format": topic.get("format", ""),
        "levelRange": topic.get("levelRange", ""),
        "levels": topic.get("levels", []),
        "exampleCount": len(topic.get("examples", [])),
    }


def load_topics(language: str, skill: str) -> list[dict[str, Any]]:
    topics: list[dict[str, Any]] = []
    for path in topic_files(language, skill):
        try:
            topics.append(public_topic(read_json(path)))
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return sorted(topics, key=lambda item: (item.get("order") or 999999, item["title"].lower()))


def module_payloads() -> list[dict[str, Any]]:
    modules: list[dict[str, Any]] = []
    for language in LANGUAGE_ORDER:
        for skill in SKILL_ORDER:
            topics = load_topics(language, skill)
            levels = sorted(
                {level for topic in topics for level in topic.get("levels", [])},
                key=lambda level: SUPPORTED_LEVELS.index(level) if level in SUPPORTED_LEVELS else 99,
            )
            modules.append(
                {
                    "id": f"{language}-{skill}",
                    "language": language,
                    "languageName": SUPPORTED_LANGUAGES[language]["name"],
                    "languageNameZh": SUPPORTED_LANGUAGES[language]["nameZh"],
                    "skill": skill,
                    "skillLabel": SKILLS[skill]["label"],
                    "skillLabelZh": SKILLS[skill]["labelZh"],
                    "label": f"{SUPPORTED_LANGUAGES[language]['name']} {SKILLS[skill]['label']}",
                    "topicCount": len(topics),
                    "levels": levels,
                }
            )
    return modules


def strip_json_wrapper(text: str) -> str:
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE)
    if fence:
        cleaned = fence.group(1).strip()
    if cleaned.startswith(("{", "[")):
        return cleaned
    array_start = cleaned.find("[")
    array_end = cleaned.rfind("]")
    object_start = cleaned.find("{")
    object_end = cleaned.rfind("}")
    if array_start != -1 and array_end > array_start:
        return cleaned[array_start : array_end + 1]
    if object_start != -1 and object_end > object_start:
        return cleaned[object_start : object_end + 1]
    return cleaned


def parse_import_payload(payload: Any, raw_body: str) -> list[dict[str, Any]]:
    if payload is None:
        raw = strip_json_wrapper(raw_body)
        if not raw:
            raise ValueError("Import body is empty.")
        payload = json.loads(raw)
    if isinstance(payload, str):
        payload = json.loads(strip_json_wrapper(payload))
    if isinstance(payload, dict):
        for key in ("topics", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]
        if isinstance(payload.get("topic"), dict):
            return [payload["topic"]]
        return [payload]
    if isinstance(payload, list):
        return payload
    raise ValueError("Import payload must be a topic object or a list of topic objects.")


def unique_topic_id_for_import(language: str, skill: str, desired_id: str, reserved_ids: set[tuple[str, str, str]]) -> str:
    base = slugify(desired_id, "topic")
    candidate = base
    counter = 2
    while (topic_path(language, skill, candidate).exists() or (language, skill, candidate) in reserved_ids):
        candidate = f"{base}-{counter}"
        counter += 1
    reserved_ids.add((language, skill, candidate))
    return candidate


def next_available_order(used_orders: set[int]) -> int:
    order = max(used_orders, default=0) + 1
    while order in used_orders:
        order += 1
    used_orders.add(order)
    return order


def prepare_imported_topics(
    raw_topics: list[dict[str, Any]],
    fallback_language: str,
    fallback_skill: str,
) -> list[dict[str, Any]]:
    imported: list[dict[str, Any]] = []
    reserved_ids: set[tuple[str, str, str]] = set()
    used_orders_by_module: dict[tuple[str, str], set[int]] = {}

    for raw_topic in raw_topics:
        topic = normalise_topic(raw_topic, fallback_language, fallback_skill)
        language = topic["language"]
        skill = topic["skill"]
        module_key = (language, skill)

        if module_key not in used_orders_by_module:
            used_orders_by_module[module_key] = {
                coerce_order(existing.get("order"))
                for existing in load_topics(language, skill)
                if coerce_order(existing.get("order")) > 0
            }

        topic["id"] = unique_topic_id_for_import(language, skill, topic["id"], reserved_ids)

        used_orders = used_orders_by_module[module_key]
        current_order = coerce_order(topic.get("order"))
        if current_order <= 0 or current_order in used_orders:
            topic["order"] = next_available_order(used_orders)
        else:
            used_orders.add(current_order)
            topic["order"] = current_order

        topic["updatedAt"] = datetime.now(timezone.utc).isoformat()
        imported.append(topic)

    return imported


def audio_file_is_usable(path: Path | None) -> bool:
    return bool(path and path.exists() and path.is_file() and path.stat().st_size > 1024)


async def generate_edge_audio(text: str, voice: str, output_path: Path) -> None:
    try:
        import edge_tts
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "edge-tts is not installed. Run `python start.py` or install requirements.txt."
        ) from exc

    communicate = edge_tts.Communicate(text, voice=voice)
    await communicate.save(str(output_path))


@app.get("/api/config")
def get_config():
    return jsonify(
        {
            "modules": module_payloads(),
            "levels": SUPPORTED_LEVELS,
            "languages": [
                {
                    "code": code,
                    "name": config["name"],
                    "nameZh": config["nameZh"],
                    "defaultVoice": config["voices"][0]["id"],
                    "voices": config["voices"],
                }
                for code, config in SUPPORTED_LANGUAGES.items()
            ],
            "skills": [
                {"id": skill, "label": config["label"], "labelZh": config["labelZh"]}
                for skill, config in SKILLS.items()
            ],
        }
    )


@app.get("/api/modules")
def get_modules():
    return jsonify({"modules": module_payloads()})


@app.get("/api/topics")
def get_topics():
    language = normalise_language(request.args.get("language"))
    skill = normalise_skill(request.args.get("skill"))
    topics = load_topics(language, skill)
    return jsonify(
        {
            "language": language,
            "skill": skill,
            "topics": topics,
            "summaries": [topic_summary(topic) for topic in topics],
        }
    )


@app.get("/api/topics/<language>/<skill>/<topic_id>")
def get_topic(language: str, skill: str, topic_id: str):
    try:
        path = topic_path(language, skill, topic_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not path.exists():
        return jsonify({"error": "Topic not found."}), 404
    return jsonify({"topic": public_topic(read_json(path))})


@app.patch("/api/topics/<language>/<skill>/<topic_id>/core-takeaway")
def update_core_takeaway(language: str, skill: str, topic_id: str):
    try:
        path = topic_path(language, skill, topic_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not path.exists():
        return jsonify({"error": "Topic not found."}), 404

    payload = request.get_json(silent=True) or {}
    core_takeaway = str(payload.get("coreTakeaway") or "")[:20000]
    topic = read_json(path)
    topic["coreTakeaway"] = core_takeaway
    topic["updatedAt"] = datetime.now(timezone.utc).isoformat()
    write_json(path, topic)
    return jsonify({"topic": public_topic(topic)})


@app.delete("/api/topics/<language>/<skill>/<topic_id>")
def delete_topic(language: str, skill: str, topic_id: str):
    try:
        path = topic_path(language, skill, topic_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not path.exists():
        return jsonify({"error": "Topic not found."}), 404

    lang = normalise_language(language)
    mode = normalise_skill(skill)
    path.unlink()
    shutil.rmtree(topic_audio_dir(lang, mode, topic_id), ignore_errors=True)

    return jsonify(
        {
            "deleted": topic_id,
            "language": lang,
            "skill": mode,
            "modules": module_payloads(),
            "topics": load_topics(lang, mode),
        }
    )


@app.post("/api/topics/import")
def import_topics():
    payload = request.get_json(silent=True)
    raw_body = request.get_data(as_text=True) if payload is None else ""
    payload_language = payload.get("language") if isinstance(payload, dict) else None
    payload_skill = payload.get("skill") if isinstance(payload, dict) else None
    fallback_language = normalise_language(request.args.get("language") or payload_language)
    fallback_skill = normalise_skill(request.args.get("skill") or payload_skill)

    try:
        raw_topics = parse_import_payload(payload, raw_body)
        imported = prepare_imported_topics(raw_topics, fallback_language, fallback_skill)
        for topic in imported:
            write_json(topic_path(topic["language"], topic["skill"], topic["id"]), topic)
    except json.JSONDecodeError as exc:
        return jsonify({"error": f"Could not parse JSON near line {exc.lineno}, column {exc.colno}: {exc.msg}."}), 400
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        {
            "imported": imported,
            "modules": module_payloads(),
        }
    )


@app.get("/api/schema/topic")
def topic_schema():
    return jsonify(
        {
            "id": "future-work",
            "language": "en",
            "skill": "writing",
            "category": "Work",
            "title": "The future of work",
            "prompt": "Write about how work may change in the next ten years.",
            "format": "Opinion essay · 180-220 words",
            "levelRange": "B1 - C1",
            "examples": [
                {"level": "B1", "title": "A simple view", "body": "Example paragraphs..."},
                {"level": "C1", "title": "A nuanced view", "body": "Example paragraphs..."},
            ],
        }
    )


@app.get("/api/tts/voices")
def list_tts_voices():
    return jsonify(
        {
            "languages": [
                {
                    "code": code,
                    "name": config["name"],
                    "nameZh": config["nameZh"],
                    "defaultVoice": config["voices"][0]["id"],
                    "voices": config["voices"],
                }
                for code, config in SUPPORTED_LANGUAGES.items()
            ]
        }
    )


@app.post("/api/tts")
def create_tts_audio():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text is required."}), 400
    if len(text) > 15000:
        return jsonify({"error": "Text is too long for one audio request."}), 400

    language = normalise_language(payload.get("language"))
    skill = normalise_skill(payload.get("skill"))
    topic_id = str(payload.get("topicId") or "").strip()
    gender = str(payload.get("gender") or "female").strip().lower()
    voice = str(payload.get("voice") or voice_for_language_gender(language, gender))
    if voice not in ALLOWED_VOICES:
        return jsonify({"error": "Unsupported voice."}), 400

    audio_hash = hashlib.sha1(f"{voice}\n{text}".encode("utf-8")).hexdigest()[:16]
    if topic_id and TOPIC_ID_RE.match(topic_id):
        output_dir = topic_audio_dir(language, skill, topic_id)
        audio_prefix = f"/audio/topics/{language}/{skill}/{topic_id}"
    else:
        output_dir = AUDIO_DIR / "tts" / language
        audio_prefix = f"/audio/tts/{language}"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{audio_hash}.mp3"
    audio_path = f"{audio_prefix}/{output_path.name}"

    if audio_file_is_usable(output_path):
        return jsonify(
            {
                "audio_path": audio_path,
                "audio_url": request.host_url.rstrip("/") + audio_path,
                "voice": voice,
                "language": language,
                "cached": True,
            }
        )

    try:
        asyncio.run(generate_edge_audio(text, voice, output_path))
        if not audio_file_is_usable(output_path):
            raise RuntimeError("Edge TTS returned an empty or unreadable MP3 file.")
    except Exception as exc:
        output_path.unlink(missing_ok=True)
        return jsonify({"error": f"Could not generate audio with {voice}: {exc}"}), 502

    return jsonify(
        {
            "audio_path": audio_path,
            "audio_url": request.host_url.rstrip("/") + audio_path,
            "voice": voice,
            "language": language,
            "cached": False,
        }
    )


@app.get("/audio/<path:filename>")
def serve_audio(filename: str):
    return send_from_directory(AUDIO_DIR, filename)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    target = FRONTEND_DIST / path
    if path and target.exists() and target.is_file():
        return send_from_directory(FRONTEND_DIST, path)

    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return send_from_directory(FRONTEND_DIST, "index.html")

    return jsonify(
        {
            "message": "Frontend build not found. Run `npm run build` or use `npm run dev`.",
            "api": "/api/config",
        }
    )


if __name__ == "__main__":
    ensure_dirs()
    port = int(os.environ.get("PORT", "8770"))
    app.run(host="127.0.0.1", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
