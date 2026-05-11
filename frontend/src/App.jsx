import {
  AlignLeft,
  Bold,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  FileJson,
  Headphones,
  Import,
  Loader2,
  Menu,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
  Volume2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_MODULE_ID = "es-writing";
const PROMPT_LANGUAGES = [
  { code: "en", short: "English", name: "English", exam: "Cambridge-style" },
  { code: "es", short: "Spanish", name: "Spanish", exam: "DELE-style" },
  { code: "fr", short: "French", name: "French", exam: "DELF-style" },
  { code: "de", short: "German", name: "German", exam: "Goethe/TELC-style" }
];
const TOPIC_COUNT_OPTIONS = [10, 20, 30, 50];
const PROMPT_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MAX_DRAFT_CHARS = 50000;
const MAX_IMPORT_CHARS = 600000;
const MAX_TAKEAWAY_CHARS = 20000;
const DEFAULT_LENGTH_TARGETS = {
  writing: {
    A1: "60-90 words",
    A2: "100-140 words",
    B1: "150-200 words",
    B2: "200-250 words",
    C1: "250-320 words",
    C2: "320-420 words"
  },
  speaking: {
    A1: "45-60 seconds",
    A2: "1-2 minutes",
    B1: "2-3 minutes",
    B2: "3-4 minutes",
    C1: "4-5 minutes",
    C2: "5-6 minutes"
  }
};

function selectedPromptLevels(settings) {
  const selected = [settings.levelA || "B1", settings.levelB || "B2"].filter((level) => PROMPT_LEVELS.includes(level));
  return [...new Set(selected)].sort((first, second) => PROMPT_LEVELS.indexOf(first) - PROMPT_LEVELS.indexOf(second));
}

function promptLevelRange(levels) {
  if (levels.length <= 1) return levels[0] || "B1";
  return `${levels[0]} - ${levels[levels.length - 1]}`;
}

function sanitizeTakeawayHtml(html) {
  if (typeof document === "undefined") return String(html || "").slice(0, MAX_TAKEAWAY_CHARS);
  const template = document.createElement("template");
  template.innerHTML = String(html || "").slice(0, MAX_TAKEAWAY_CHARS);
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "BR", "DIV", "P", "SPAN", "FONT"]);
  const allowedColors = new Set(["rgb(180, 35, 53)", "rgb(31, 95, 191)", "rgb(124, 59, 177)", "#b42335", "#1f5fbf", "#7c3bb1"]);

  function clean(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      clean(child);
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }
      const color = child.style?.color || child.getAttribute("color");
      [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name));
      if (color && allowedColors.has(color.toLowerCase())) {
        child.style.color = color;
      }
    });
  }

  clean(template.content);
  return template.innerHTML.slice(0, MAX_TAKEAWAY_CHARS);
}

function countWords(text) {
  const cleaned = String(text || "").trim();
  return cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;
}

function getDraftKey(moduleId) {
  return `language-output-lab.drafts.${moduleId}.v1`;
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function moduleIcon(skill) {
  return skill === "speaking" ? Mic : PenLine;
}

function moduleShortLabel(module) {
  const language = {
    en: "Eng",
    es: "Esp",
    fr: "Fr",
    de: "Ger"
  }[module.language] || module.languageName;
  const skill = module.skill === "speaking" ? "Sp" : "Wr";
  return `${language} ${skill}`;
}

function App() {
  const [config, setConfig] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(DEFAULT_MODULE_ID);
  const [topics, setTopics] = useState([]);
  const [activeTopicId, setActiveTopicId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [leftOpen, setLeftOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [busyAudio, setBusyAudio] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [promptSettings, setPromptSettings] = useState({
    language: "es",
    skill: "writing",
    topicCount: 10,
    levelA: "B1",
    levelB: "B2",
    lengthTargets: { ...DEFAULT_LENGTH_TARGETS.writing }
  });
  const currentAudioRef = useRef(null);

  const activeModule = useMemo(
    () => modules.find((item) => item.id === activeModuleId) || modules[0],
    [modules, activeModuleId]
  );

  const activeTopic = useMemo(
    () => topics.find((topic) => topic.id === activeTopicId) || topics[0],
    [topics, activeTopicId]
  );

  const activeIndex = useMemo(
    () => topics.findIndex((topic) => topic.id === activeTopic?.id),
    [topics, activeTopic]
  );

  const visibleExamples = useMemo(() => {
    if (!activeTopic) return [];
    return activeTopic.examples;
  }, [activeTopic]);

  const draft = activeTopic ? drafts[activeTopic.id] || "" : "";
  const completedCount = topics.filter((topic) => countWords(drafts[topic.id]) >= 40).length;

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        setLoading(true);
        const response = await fetch("/api/config");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load config.");
        if (cancelled) return;
        setConfig(data);
        setModules(data.modules || []);
        const preferred = data.modules?.find((item) => item.id === DEFAULT_MODULE_ID && item.topicCount > 0);
        const firstWithTopics = data.modules?.find((item) => item.topicCount > 0);
        setActiveModuleId((preferred || firstWithTopics || data.modules?.[0])?.id || DEFAULT_MODULE_ID);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!activeModule) return;
    let cancelled = false;
    async function loadTopics() {
      try {
        setTopicLoading(true);
        setError("");
        const params = new URLSearchParams({
          language: activeModule.language,
          skill: activeModule.skill
        });
        const response = await fetch(`/api/topics?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load topics.");
        if (cancelled) return;
        setTopics(data.topics || []);
        setActiveTopicId((previous) => {
          if (data.topics?.some((topic) => topic.id === previous)) return previous;
          return data.topics?.[0]?.id || "";
        });
        try {
          setDrafts(JSON.parse(localStorage.getItem(getDraftKey(activeModule.id)) || "{}"));
        } catch {
          setDrafts({});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setTopicLoading(false);
      }
    }
    loadTopics();
    return () => {
      cancelled = true;
    };
  }, [activeModule?.id, refreshKey]);

  useEffect(() => {
    return () => {
      currentAudioRef.current?.pause();
    };
  }, []);

  const generatedPrompt = useMemo(() => {
    const language = PROMPT_LANGUAGES.find((item) => item.code === promptSettings.language) || PROMPT_LANGUAGES[1];
    const count = Number(promptSettings.topicCount) || 10;
    const levels = selectedPromptLevels(promptSettings);
    const levelRange = promptLevelRange(levels);
    const skill = promptSettings.skill === "speaking" ? "speaking" : "writing";
    const skillNoun = skill === "speaking" ? "spoken answer transcript" : "model essay";
    const formatExample =
      skill === "speaking"
        ? "Spoken monologue · neutral/personal · 2-3 minutes"
        : "Opinion essay · neutral/formal · 180-220 words";
    const lengthLines = levels
      .map((level) => `- ${level}: ${promptSettings.lengthTargets?.[level] || DEFAULT_LENGTH_TARGETS[skill][level]}`)
      .join("\n");
    const examplesShape = levels
      .map((level) => `    {
      "level": "${level}",
      "title": "Short ${level} model title in ${language.name}",
      "body": "A ${level} ${skillNoun}. Target length: ${promptSettings.lengthTargets?.[level] || DEFAULT_LENGTH_TARGETS[skill][level]}. Use clear paragraph breaks separated by blank lines."
    }`)
      .join(",\n");

    return `Create ${count} common ${language.exam} ${language.name} ${skill} topics for adult language learners.

Goal:
- Practical, general, realistic output practice, not niche trivia.
- Suitable for ${levelRange} learners, with strong level distinction between all examples.
- Varied task types and themes: daily life, education, work, technology, relationships, travel, health, environment, social issues, personal opinion, formal messages, informal messages, narrative tasks, and balanced opinion tasks.
- High-quality ${language.name}: authentic phrasing, realistic tasks, useful exam-style production, and clear communicative goals.

Critical output rules:
- Return JSON only.
- Return a valid JSON array of topic objects, not an object with a "topics" key.
- Do not wrap the JSON in Markdown fences.
- Use double quotes, valid escaping, and no trailing commas.
- Do not include comments or explanations outside the JSON.
- Do not include "id" or "order"; my app assigns unique ids and appends safe order numbers on import.
- Avoid duplicate titles inside this response.
- Use exactly "${language.code}" for every "language" value and exactly "${skill}" for every "skill" value.

Each topic object must use this exact structure:
{
  "language": "${language.code}",
  "skill": "${skill}",
  "category": "Short reusable category, e.g. Work, Education, Travel",
  "title": "Clear topic title in ${language.name}",
  "prompt": "Learner-facing ${skill} task in ${language.name}. Include the situation, what to cover, and the expected communicative goal.",
  "format": "Concrete task format · register · target length, e.g. ${formatExample}",
  "levelRange": "${levelRange}",
  "examples": [
${examplesShape}
  ]
}

Length targets:
${lengthLines}

Format field requirements:
- Always specify genre/task type, register, and target length.
- For writing, vary formats such as informal email, formal email, opinion essay, narrative response, advantages/disadvantages essay, complaint, recommendation, reflective text, and proposal.
- For speaking, vary formats such as personal monologue, opinion response, role-play prompt, picture/situation description, comparison task, problem-solving response, and short presentation.

Quality requirements:
- Write authentic ${language.name}, not translated English.
- Make the prompt field specific enough that a learner knows exactly what to produce.
- Make the examples meaningfully different by level: simpler vocabulary and structure at lower levels; stronger cohesion, nuance, idiomatic language, and richer argumentation at higher levels.
- Keep all example bodies as plain text strings with paragraph breaks represented as \\n\\n inside the JSON string.
- Ensure every topic has exactly one example object for each requested level: ${levels.join(", ")}.
- Do not add extra or intermediate example levels beyond that requested list.
- Keep the data structure flat and extensible so I can import it directly into my Flask + React app.
- The import tool can tolerate JSON wrappers, duplicate ids, and order conflicts, but clean JSON arrays import fastest and are easiest to review.
- Do not include UI instructions such as "show/hide examples"; the app handles display logic.
- Do not include explanations outside the JSON array.`;
  }, [promptSettings]);

  function updateDraft(value) {
    if (!activeTopic || !activeModule) return;
    setDrafts((current) => {
      const next = { ...current, [activeTopic.id]: String(value || "").slice(0, MAX_DRAFT_CHARS) };
      localStorage.setItem(getDraftKey(activeModule.id), JSON.stringify(next));
      return next;
    });
  }

  function updateImportText(value) {
    setImportText(String(value || "").slice(0, MAX_IMPORT_CHARS));
    setImportStatus((current) => (current && current !== "importing" ? "" : current));
  }

  function clearDraft() {
    if (!activeTopic || !draft.trim()) return;
    if (!window.confirm("Clear this draft?")) return;
    updateDraft("");
  }

  function chooseTopic(topicId) {
    setActiveTopicId(topicId);
    setLeftOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function playText(text, key, gender = "female") {
    if (!text?.trim() || !activeModule) return;
    setAudioError("");
    setBusyAudio(key);
    currentAudioRef.current?.pause();
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: activeModule.language,
          skill: activeModule.skill,
          topicId: activeTopic?.id,
          gender
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create audio.");
      const audio = new Audio(data.audio_url);
      currentAudioRef.current = audio;
      audio.onended = () => setBusyAudio("");
      audio.onerror = () => {
        setAudioError("Audio playback failed.");
        setBusyAudio("");
      };
      await audio.play();
    } catch (err) {
      setAudioError(err.message);
      setBusyAudio("");
    }
  }

  async function importTopics() {
    if (!activeModule || !importText.trim()) return;
    if (importText.length > MAX_IMPORT_CHARS) {
      setImportStatus(`Import text is too large. Keep it under ${MAX_IMPORT_CHARS.toLocaleString()} characters.`);
      return;
    }
    setImportStatus("importing");
    try {
      const params = new URLSearchParams({
        language: activeModule.language,
        skill: activeModule.skill
      });
      const response = await fetch(`/api/topics/import?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: importText
      });
      const responseText = await response.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { error: responseText || "Import failed." };
      }
      if (!response.ok) throw new Error(data.error || "Import failed.");
      const importedCount = Array.isArray(data.imported) ? data.imported.length : 0;
      setImportText("");
      setImportStatus(`Imported ${importedCount} topic${importedCount === 1 ? "" : "s"}`);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setImportStatus(`Import failed: ${err.message}`);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setImportStatus("Prompt copied");
    } catch {
      setImportStatus("Copy failed. Select the text manually.");
    }
  }

  function updateTopicInState(updatedTopic) {
    if (!updatedTopic) return;
    setTopics((current) => current.map((topic) => (topic.id === updatedTopic.id ? updatedTopic : topic)));
  }

  async function deleteActiveTopic() {
    if (!activeModule || !activeTopic) return;
    const confirmed = window.confirm(
      `Delete "${activeTopic.title}" and its related audio/cache files? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/topics/${activeModule.language}/${activeModule.skill}/${activeTopic.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed.");

      setModules(data.modules || modules);
      setTopics(data.topics || []);
      const nextTopic = data.topics?.[Math.min(activeIndex, Math.max((data.topics?.length || 1) - 1, 0))];
      setActiveTopicId(nextTopic?.id || "");
      setDrafts((current) => {
        const next = { ...current };
        delete next[activeTopic.id];
        localStorage.setItem(getDraftKey(activeModule.id), JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="boot-screen">
        <Loader2 className="spin" size={26} />
        <span>Loading Language Output Lab</span>
      </div>
    );
  }

  return (
    <div className={`app ${rightOpen ? "right-open" : "right-closed"} ${leftCollapsed ? "left-closed" : "left-open"}`}>
      <TopNav
        modules={modules}
        activeModuleId={activeModule?.id}
        onChoose={setActiveModuleId}
        onOpenLeft={() => setLeftOpen(true)}
      />

      <div className="workspace">
        <LeftSidebar
          module={activeModule}
          topics={topics}
          activeTopic={activeTopic}
          drafts={drafts}
          completedCount={completedCount}
          open={leftOpen}
          collapsed={leftCollapsed}
          onClose={() => setLeftOpen(false)}
          onToggle={() => setLeftCollapsed((value) => !value)}
          onChoose={chooseTopic}
        />

        {leftOpen ? <button className="scrim" type="button" aria-label="Close menu" onClick={() => setLeftOpen(false)} /> : null}

        <main className="practice-pane">
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {topicLoading ? <Notice>Loading topics...</Notice> : null}
          {!topicLoading && !activeTopic ? (
            <EmptyModule module={activeModule} />
          ) : activeTopic ? (
            <PracticeView
              module={activeModule}
              topic={activeTopic}
              activeIndex={activeIndex}
              topicCount={topics.length}
              draft={draft}
              visibleExamples={visibleExamples}
              busyAudio={busyAudio}
              audioError={audioError}
              onDraft={updateDraft}
              onClearDraft={clearDraft}
              onListen={playText}
              onDeleteTopic={deleteActiveTopic}
              onPrev={() => activeIndex > 0 && chooseTopic(topics[activeIndex - 1].id)}
              onNext={() => activeIndex < topics.length - 1 && chooseTopic(topics[activeIndex + 1].id)}
            />
          ) : null}
        </main>

        <RightTools
          open={rightOpen}
          module={activeModule}
          topic={activeTopic}
          promptSettings={promptSettings}
          generatedPrompt={generatedPrompt}
          importText={importText}
          importStatus={importStatus}
          onToggle={() => setRightOpen((value) => !value)}
          onPromptSettings={setPromptSettings}
          onImportText={updateImportText}
          onImport={importTopics}
          onCopyPrompt={copyPrompt}
          onTopicUpdated={updateTopicInState}
        />
      </div>
    </div>
  );
}

function TopNav({ modules, activeModuleId, onChoose, onOpenLeft }) {
  return (
    <header className="top-nav">
      <div className="brand-block">
        <button className="icon-button mobile-only" type="button" aria-label="Open topics" onClick={onOpenLeft}>
          <Menu size={19} />
        </button>
        <div className="brand-mark">
          <BookOpen size={20} />
          <span>Language Output Lab</span>
        </div>
      </div>
      <nav className="module-tabs" aria-label="Practice modules">
        {modules.map((module) => {
          const Icon = moduleIcon(module.skill);
          return (
            <button
              className={`module-tab ${module.id === activeModuleId ? "active" : ""}`}
              key={module.id}
              title={`${module.languageName} ${module.skillLabel}`}
              type="button"
              onClick={() => onChoose(module.id)}
            >
              <Icon size={16} />
              <span>{moduleShortLabel(module)}</span>
              <small>{module.topicCount}</small>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function LeftSidebar({ module, topics, activeTopic, drafts, completedCount, open, collapsed, onClose, onToggle, onChoose }) {
  const progress = topics.length ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <aside className={`left-sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      {collapsed ? (
        <button className="icon-button left-rail-toggle" type="button" aria-label="Open topic list" onClick={onToggle}>
          <PanelLeftOpen size={20} />
        </button>
      ) : null}
      <div className="left-sidebar-inner">
      <button className="icon-button sidebar-close mobile-only" type="button" aria-label="Close topics" onClick={onClose}>
        <X size={18} />
      </button>
      <button className="icon-button sidebar-collapse desktop-only" type="button" aria-label="Collapse topic list" onClick={onToggle}>
        <PanelLeftClose size={19} />
      </button>
      <div className="sidebar-title">
        <span>{module?.languageName || "Language"}</span>
        <h1>{module?.skillLabel || "Practice"}</h1>
        <p>{topics.length} topics · {module?.levels?.join(" / ") || "no levels yet"}</p>
      </div>
      <div className="progress-line">
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-meta">
        <span>Progress</span>
        <strong>{completedCount}/{topics.length}</strong>
      </div>
      <ol className="topic-list">
        {topics.map((topic, index) => {
          const done = countWords(drafts[topic.id]) >= 40;
          return (
            <li key={topic.id}>
              <button
                className={`topic-button ${topic.id === activeTopic?.id ? "active" : ""}`}
                type="button"
                onClick={() => onChoose(topic.id)}
              >
                <span className="topic-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="topic-label">
                  <strong>{topic.title}</strong>
                  <small>{topic.category} · {topic.levelRange}</small>
                </span>
                {done ? <Check size={15} /> : null}
              </button>
            </li>
          );
        })}
      </ol>
      </div>
    </aside>
  );
}

function PracticeView({
  module,
  topic,
  activeIndex,
  topicCount,
  draft,
  visibleExamples,
  busyAudio,
  audioError,
  onDraft,
  onClearDraft,
  onListen,
  onDeleteTopic,
  onPrev,
  onNext
}) {
  return (
    <div className="practice-content">
      <section className="topic-head">
        <div className="topic-head-top">
          <div className="topic-meta">
            <span>{topic.category}</span>
            <span>{topic.levelRange}</span>
            <span>{activeIndex + 1}/{topicCount}</span>
          </div>
          <button className="ghost-button danger" type="button" onClick={onDeleteTopic}>
            <Trash2 size={15} />
            Delete Topic
          </button>
        </div>
        <h2>{topic.title}</h2>
        <div className="prompt-row">
          <p>{topic.prompt}</p>
          <button
            className="secondary-button prompt-listen"
            type="button"
            disabled={Boolean(busyAudio)}
            onClick={() => onListen(topic.prompt, `topic-prompt-${topic.id}`, "female")}
          >
            {busyAudio === `topic-prompt-${topic.id}` ? <Loader2 className="spin" size={15} /> : <Volume2 size={15} />}
            Listen
          </button>
        </div>
        <div className="format-line">
          <AlignLeft size={15} />
          <span>{topic.format || `${module.skillLabel} practice`}</span>
        </div>
      </section>

      <section className="writing-zone" aria-label="Practice input">
        <div className="section-head">
          <h3>{module.skill === "speaking" ? "Speaking Draft" : "Practice Area"}</h3>
          <div className="write-actions">
            <span><strong>{countWords(draft)}</strong> words</span>
            <button className="ghost-button danger" type="button" onClick={onClearDraft}>
              <Trash2 size={15} />
              Clear
            </button>
          </div>
        </div>
        <textarea
          className="practice-input"
          rows={3}
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          placeholder={module.skill === "speaking" ? "Draft your speaking answer here..." : "Write your answer here..."}
        />
      </section>

      <section className="examples-zone" aria-label="Model examples">
        <div className="section-head example-toolbar">
          <h3>Examples</h3>
        </div>
        {audioError ? <Notice tone="danger">{audioError}</Notice> : null}
        <div className={`examples-grid ${visibleExamples.length === 1 ? "single" : ""}`}>
          {visibleExamples.map((example) => (
            <ExampleCard
              key={example.level}
              example={example}
              busyAudio={busyAudio}
              onListen={onListen}
            />
          ))}
        </div>
      </section>

      <div className="topic-nav">
        <button className="nav-step" type="button" disabled={activeIndex <= 0} onClick={onPrev}>
          <ChevronLeft size={18} />
          <span>Previous</span>
        </button>
        <button className="nav-step" type="button" disabled={activeIndex >= topicCount - 1} onClick={onNext}>
          <span>Next</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function ExampleCard({ example, busyAudio, onListen }) {
  const paragraphs = splitParagraphs(example.body);
  const wholeText = `${example.title}\n\n${example.body}`;
  return (
    <div className="example-stack">
      <div className="example-external-tools" aria-label={`${example.level} example listen controls`}>
        <button type="button" disabled={Boolean(busyAudio)} onClick={() => onListen(wholeText, `${example.level}-whole-default`, "female")}>
          {busyAudio === `${example.level}-whole-default` ? <Loader2 className="spin" size={14} /> : <Volume2 size={14} />}
          {example.level} Example
        </button>
        <button type="button" disabled={Boolean(busyAudio)} onClick={() => onListen(wholeText, `${example.level}-whole-male`, "male")}>
          {busyAudio === `${example.level}-whole-male` ? <Loader2 className="spin" size={14} /> : <Volume2 size={14} />}
          Male
        </button>
        <button type="button" disabled={Boolean(busyAudio)} onClick={() => onListen(wholeText, `${example.level}-whole-female`, "female")}>
          {busyAudio === `${example.level}-whole-female` ? <Loader2 className="spin" size={14} /> : <Volume2 size={14} />}
          Female
        </button>
      </div>
      <article className="example-card">
      <header className="example-card-head">
        <h4>{example.title}</h4>
      </header>
      <div className="example-body">
        {paragraphs.map((paragraph, index) => {
          const key = `${example.level}-${index}`;
          return (
            <p key={key}>
              <span>{paragraph}</span>
              <button
                className="paragraph-listen"
                type="button"
                disabled={Boolean(busyAudio)}
                onClick={() => onListen(paragraph, key, "female")}
              >
                {busyAudio === key ? <Loader2 className="spin" size={14} /> : <Headphones size={14} />}
                Listen
              </button>
            </p>
          );
        })}
        <div className="example-word-count">{example.wordCount || countWords(example.body)} words</div>
      </div>
    </article>
    </div>
  );
}

function RightTools({
  open,
  module,
  topic,
  promptSettings,
  generatedPrompt,
  importText,
  importStatus,
  onToggle,
  onPromptSettings,
  onImportText,
  onImport,
  onCopyPrompt,
  onTopicUpdated
}) {
  const editorRef = useRef(null);
  const [takeawayStatus, setTakeawayStatus] = useState("");
  const levels = selectedPromptLevels(promptSettings);

  useEffect(() => {
    setTakeawayStatus("");
    if (open && editorRef.current) {
      editorRef.current.innerHTML = sanitizeTakeawayHtml(topic?.coreTakeaway || "");
    }
  }, [open, topic?.id, topic?.coreTakeaway]);

  if (!open) {
    return (
      <aside className="right-tools collapsed">
        <button className="icon-button" type="button" aria-label="Open tools" onClick={onToggle}>
          <PanelRightOpen size={20} />
        </button>
      </aside>
    );
  }

  function update(field, value) {
    onPromptSettings((current) => {
      if (field !== "skill") return { ...current, [field]: value };
      const nextSkill = value === "speaking" ? "speaking" : "writing";
      const nextTargets = { ...current.lengthTargets };
      for (const level of Object.keys(DEFAULT_LENGTH_TARGETS[nextSkill])) {
        nextTargets[level] = DEFAULT_LENGTH_TARGETS[nextSkill][level];
      }
      return { ...current, skill: nextSkill, lengthTargets: nextTargets };
    });
  }

  function updateLengthTarget(level, value) {
    onPromptSettings((current) => ({
      ...current,
      lengthTargets: {
        ...current.lengthTargets,
        [level]: value
      }
    }));
  }

  function runEditorCommand(command, value = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  async function saveTakeaway() {
    if (!module || !topic || !editorRef.current) return;
    setTakeawayStatus("Saving...");
    try {
      const cleanHtml = sanitizeTakeawayHtml(editorRef.current.innerHTML);
      editorRef.current.innerHTML = cleanHtml;
      const response = await fetch(`/api/topics/${module.language}/${module.skill}/${topic.id}/core-takeaway`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreTakeaway: cleanHtml })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      onTopicUpdated(data.topic);
      setTakeawayStatus("Saved");
    } catch (err) {
      setTakeawayStatus(err.message);
    }
  }

  return (
    <aside className="right-tools">
      <div className="tools-head">
        <div>
          <span>Tools</span>
          <h2>Generate & Import</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Collapse tools" onClick={onToggle}>
          <PanelRightClose size={19} />
        </button>
      </div>

      <section className="tool-section takeaway-section">
        <div className="tool-title">
          <BookOpen size={17} />
          <h3>Core Takeaway</h3>
        </div>
        <div className="takeaway-toolbar">
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand("bold")}>
            <Bold size={14} />
            Bold
          </button>
          {[
            ["red", "#b42335"],
            ["blue", "#1f5fbf"],
            ["purple", "#7c3bb1"]
          ].map(([name, color]) => (
            <button
              key={name}
              className="color-button"
              style={{ "--swatch": color }}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runEditorCommand("foreColor", color)}
            >
              {name}
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          className="takeaway-editor"
          contentEditable={Boolean(topic)}
          data-placeholder={topic ? "Save useful phrases, patterns, or observations here..." : "Choose a topic first."}
          suppressContentEditableWarning
        />
        <button className="secondary-button" type="button" disabled={!topic} onClick={saveTakeaway}>
          <Save size={15} />
          Save takeaway
        </button>
        {takeawayStatus ? <p className="tool-status">{takeawayStatus}</p> : null}
      </section>

      <section className="tool-section">
        <div className="tool-title">
          <Sparkles size={17} />
          <h3>Prompt Generator</h3>
        </div>
        <div className="generator-field">
          <span>Language</span>
          <div className="segmented-control">
            {PROMPT_LANGUAGES.map((language) => (
              <button
                key={language.code}
                className={promptSettings.language === language.code ? "active" : ""}
                type="button"
                onClick={() => update("language", language.code)}
              >
                {language.short}
              </button>
            ))}
          </div>
        </div>
        <div className="generator-field">
          <span>Skill</span>
          <div className="segmented-control two">
            {[
              ["writing", "Writing"],
              ["speaking", "Speaking"]
            ].map(([skill, label]) => (
              <button
                key={skill}
                className={promptSettings.skill === skill ? "active" : ""}
                type="button"
                onClick={() => update("skill", skill)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="generator-field">
          <span>Topic Count</span>
          <div className="segmented-control">
            {TOPIC_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                className={Number(promptSettings.topicCount) === count ? "active" : ""}
                type="button"
                onClick={() => update("topicCount", count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        <div className="generator-field">
          <span>Level Pair</span>
          <div className="level-pair-controls">
            <label>
              A
              <select value={promptSettings.levelA || "B1"} onChange={(event) => update("levelA", event.target.value)}>
                {PROMPT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <span className="level-pair-plus">+</span>
            <label>
              B
              <select value={promptSettings.levelB || "B2"} onChange={(event) => update("levelB", event.target.value)}>
                {PROMPT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-hint">Each selected level gets one example. Matching A and B requests one example level.</p>
        </div>
        <div className="generator-field">
          <span>{promptSettings.skill === "speaking" ? "Answer Length" : "Essay Length"}</span>
          <div className="length-targets">
            {levels.map((level) => (
              <label key={level}>
                {level}
                <input
                  value={promptSettings.lengthTargets?.[level] || DEFAULT_LENGTH_TARGETS[promptSettings.skill || "writing"][level]}
                  onChange={(event) => updateLengthTarget(level, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
        <textarea className="prompt-output" value={generatedPrompt} readOnly rows={16} />
        <button className="secondary-button" type="button" onClick={onCopyPrompt}>
          <Clipboard size={15} />
          Copy prompt
        </button>
      </section>

      <section className="tool-section">
        <div className="tool-title">
          <FileJson size={17} />
          <h3>Import JSON</h3>
        </div>
        <p className="import-guidance">
          Paste a JSON array, a single topic object, or an object with a topics/items array. Markdown JSON fences are accepted.
          Existing topics are not overwritten; duplicate ids get safe suffixes and order conflicts are appended.
        </p>
        <textarea
          className="import-box"
          value={importText}
          onChange={(event) => onImportText(event.target.value)}
          maxLength={MAX_IMPORT_CHARS}
          rows={8}
          spellCheck="false"
          placeholder={`[
  {
    "language": "${module?.language || "en"}",
    "skill": "${module?.skill || "writing"}",
    "category": "Education",
    "title": "...",
    "prompt": "...",
    "format": "...",
    "levelRange": "B1 - B2",
    "examples": [
      {"level": "B1", "title": "...", "body": "..."},
      {"level": "B2", "title": "...", "body": "..."}
    ]
  }
]`}
        />
        <div className="import-meta">
          <span>{importText.length.toLocaleString()} / {MAX_IMPORT_CHARS.toLocaleString()}</span>
        </div>
        <button className="primary-button full" type="button" disabled={!importText.trim() || importStatus === "importing"} onClick={onImport}>
          {importStatus === "importing" ? <Loader2 className="spin" size={16} /> : <Import size={16} />}
          Import
        </button>
        {importStatus && importStatus !== "importing" ? <p className={`tool-status ${importStatus.startsWith("Import failed") ? "error" : ""}`}>{importStatus}</p> : null}
      </section>
    </aside>
  );
}

function EmptyModule({ module }) {
  return (
    <section className="empty-module">
      <RefreshCcw size={28} />
      <h2>{module ? `${module.languageName} ${module.skillLabel}` : "Module"} has no topics yet</h2>
      <p>Add JSON files to the matching data folder, or import a topic from the tools panel.</p>
    </section>
  );
}

function Notice({ children, tone = "info" }) {
  return <div className={`notice ${tone}`}>{children}</div>;
}

export default App;
