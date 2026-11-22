"""
AI Proctor — Code Integrity Analyzer
Streamlit web UI for plagiarism detection and AI-generated code detection.
"""

import streamlit as st
import os
import itertools

# ---------------------------------------------------------------------------
# Graceful imports — backend modules may not be ready yet
# ---------------------------------------------------------------------------
_IMPORT_ERROR: str | None = None

try:
    from aiproctor.config import Config
    from aiproctor.moss_detector import MOSSDetector
    from aiproctor.embedding_detector import EmbeddingDetector
    from aiproctor.analyzer import AIProctor
except ImportError as exc:
    _IMPORT_ERROR = (
        f"⚠️ Could not import backend modules: **{exc}**\n\n"
        "Make sure you have installed the project (`pip install -e .`) "
        "and all dependencies before running the app."
    )

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="AI Proctor — Code Integrity Analyzer",
    page_icon="🔍",
    layout="wide",
)

# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    .verdict-green  { color: #28a745; font-size: 1.3rem; font-weight: 700; }
    .verdict-yellow { color: #ffc107; font-size: 1.3rem; font-weight: 700; }
    .verdict-red    { color: #dc3545; font-size: 1.3rem; font-weight: 700; }
    .match-region   {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        font-family: monospace;
        font-size: 0.85rem;
        white-space: pre-wrap;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Sidebar — navigation & API key
# ---------------------------------------------------------------------------
with st.sidebar:
    st.title("🔍 AI Proctor")
    st.caption("Code Integrity Analyzer")
    st.divider()

    page = st.radio(
        "Navigation",
        ["🔗 Plagiarism Check", "🤖 AI Detection", "📊 Full Analysis"],
        label_visibility="collapsed",
    )

    st.divider()
    st.subheader("🔑 Groq API Key")
    api_key_input = st.text_input(
        "Enter your Groq API key",
        type="password",
        value=st.session_state.get("groq_api_key", os.environ.get("GROQ_API_KEY", "")),
        help="Required for AI detection (LLM analysis). Get one at https://console.groq.com",
    )
    if api_key_input:
        st.session_state["groq_api_key"] = api_key_input

    st.divider()
    st.caption("Built with ❤️ using Streamlit")

# ---------------------------------------------------------------------------
# Title
# ---------------------------------------------------------------------------
st.title("🔍 AI Proctor — Code Integrity Analyzer")

# ---------------------------------------------------------------------------
# Early exit if backend is not importable
# ---------------------------------------------------------------------------
if _IMPORT_ERROR:
    st.error(_IMPORT_ERROR)
    st.stop()


# ===================================================================
# Helper utilities
# ===================================================================

def _get_api_key() -> str:
    """Return current API key from session state or env."""
    return st.session_state.get("groq_api_key", os.environ.get("GROQ_API_KEY", ""))


def _require_api_key() -> bool:
    """Show a warning if no API key is set; return True when key exists."""
    if not _get_api_key():
        st.warning("⚠️ Please enter your **Groq API key** in the sidebar to enable LLM-powered analysis.")
        return False
    return True


def _build_config() -> "Config":
    """Build a Config object with the current API key."""
    return Config(groq_api_key=_get_api_key())


def _similarity_color(value: float) -> str:
    """Return CSS class name based on similarity percentage."""
    if value < 0.20:
        return "green"
    elif value < 0.40:
        return "yellow"
    return "red"


def _plagiarism_verdict(similarity: float) -> tuple[str, str]:
    """Return (verdict_text, css_class)."""
    if similarity >= 0.40:
        return "🚨 Likely Plagiarized", "verdict-red"
    elif similarity >= 0.20:
        return "⚠️ Possibly Similar", "verdict-yellow"
    return "✅ Independent Work", "verdict-green"


def _ai_verdict(probability: float) -> tuple[str, str]:
    """Return (verdict_text, css_class)."""
    if probability >= 0.65:
        return "🤖 Likely AI-Generated", "verdict-red"
    elif probability >= 0.35:
        return "⚠️ Possibly AI-Assisted", "verdict-yellow"
    return "✍️ Likely Human-Written", "verdict-green"


def _render_similarity_gauge(similarity: float):
    """Render a colored progress bar for similarity."""
    pct = int(similarity * 100)
    color = _similarity_color(similarity)
    color_map = {"green": "#28a745", "yellow": "#ffc107", "red": "#dc3545"}
    st.markdown(
        f"""
        <div style="margin-bottom: 0.5rem;">
            <div style="background-color: #e9ecef; border-radius: 0.5rem; overflow: hidden; height: 28px;">
                <div style="
                    width: {pct}%;
                    background-color: {color_map[color]};
                    height: 100%;
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 0.9rem;
                ">{pct}%</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _read_uploaded_file(uploaded) -> str:
    """Read text from an UploadedFile object."""
    return uploaded.getvalue().decode("utf-8", errors="replace")


# ===================================================================
# PAGE 1 — Plagiarism Check (MOSS)
# ===================================================================

def page_plagiarism():
    st.header("🔗 Plagiarism Check (MOSS-like Similarity)")
    st.markdown("Upload or paste **two code files** to compare them for structural similarity.")

    input_method = st.radio(
        "Input method",
        ["📁 Upload files", "📝 Paste code"],
        horizontal=True,
        key="plag_input_method",
    )

    code1: str | None = None
    code2: str | None = None

    if input_method == "📁 Upload files":
        col1, col2 = st.columns(2)
        with col1:
            f1 = st.file_uploader("File 1", type=["py", "txt", "java", "c", "cpp", "js"], key="plag_f1")
            if f1:
                code1 = _read_uploaded_file(f1)
                with st.expander(f"Preview — {f1.name}", expanded=False):
                    st.code(code1, language="python")
        with col2:
            f2 = st.file_uploader("File 2", type=["py", "txt", "java", "c", "cpp", "js"], key="plag_f2")
            if f2:
                code2 = _read_uploaded_file(f2)
                with st.expander(f"Preview — {f2.name}", expanded=False):
                    st.code(code2, language="python")
    else:
        col1, col2 = st.columns(2)
        with col1:
            code1 = st.text_area("Code 1", height=300, key="plag_code1", placeholder="Paste the first code here…")
        with col2:
            code2 = st.text_area("Code 2", height=300, key="plag_code2", placeholder="Paste the second code here…")

    st.divider()

    if st.button("🔍 Compare", type="primary", use_container_width=True):
        if not code1 or not code2:
            st.error("Please provide **both** code snippets before comparing.")
            return

        with st.spinner("Analyzing similarity…"):
            try:
                detector = MOSSDetector()
                # compare_files expects file paths — use calculate_similarity for raw code
                similarity = detector.calculate_similarity(code1, code2)
                matching_regions = detector.find_matching_regions(code1, code2)
                is_plagiarized = similarity >= 0.75
            except Exception as exc:
                st.error(f"Analysis failed: {exc}")
                return

        details = ""

        # --- Results ---
        st.subheader("Results")
        col_metric, col_verdict = st.columns([1, 1])
        with col_metric:
            st.metric("Similarity Score", f"{similarity * 100:.1f}%")
            _render_similarity_gauge(similarity)
        with col_verdict:
            verdict_text, verdict_class = _plagiarism_verdict(similarity)
            st.markdown(f'<p class="{verdict_class}">{verdict_text}</p>', unsafe_allow_html=True)

        # Matching regions
        if matching_regions:
            with st.expander(f"🔎 Matching Regions ({len(matching_regions)} found)", expanded=True):
                for idx, region in enumerate(matching_regions, 1):
                    st.markdown(f"**Region {idx}**")
                    if isinstance(region, dict):
                        c1, c2 = st.columns(2)
                        with c1:
                            st.markdown("*File 1*")
                            st.code(region.get("code1", region.get("text", str(region))), language="python")
                        with c2:
                            st.markdown("*File 2*")
                            st.code(region.get("code2", region.get("text", str(region))), language="python")
                    elif isinstance(region, (list, tuple)) and len(region) >= 2:
                        c1, c2 = st.columns(2)
                        with c1:
                            st.markdown("*File 1*")
                            st.code(str(region[0]), language="python")
                        with c2:
                            st.markdown("*File 2*")
                            st.code(str(region[1]), language="python")
                    else:
                        st.markdown(f'<div class="match-region">{region}</div>', unsafe_allow_html=True)

        # Details
        if details:
            with st.expander("📝 Detailed Analysis"):
                st.markdown(details)


# ===================================================================
# PAGE 2 — AI Detection
# ===================================================================

def page_ai_detection():
    st.header("🤖 AI-Generated Code Detection")
    st.markdown("Upload or paste a code file to check if it was written by an AI.")

    if not _require_api_key():
        pass  # warning shown, but allow heuristic-only analysis

    input_method = st.radio(
        "Input method",
        ["📁 Upload file", "📝 Paste code"],
        horizontal=True,
        key="ai_input_method",
    )

    code: str | None = None
    file_name = "code"

    if input_method == "📁 Upload file":
        f = st.file_uploader("Upload code file", type=["py", "txt", "java", "c", "cpp", "js"], key="ai_file")
        if f:
            code = _read_uploaded_file(f)
            file_name = f.name
            with st.expander(f"Preview — {f.name}", expanded=False):
                st.code(code, language="python")
    else:
        code = st.text_area("Code", height=300, key="ai_code", placeholder="Paste code here…")

    st.divider()

    if st.button("🔍 Analyze", type="primary", use_container_width=True):
        if not code:
            st.error("Please provide a code snippet before analyzing.")
            return

        with st.spinner("Detecting AI patterns…"):
            try:
                config = _build_config()
                detector = EmbeddingDetector(config)
                result = detector.detect(code)
            except Exception as exc:
                st.error(f"Analysis failed: {exc}")
                return

        ai_prob = result.get("combined_score", result.get("ai_probability", 0.0))
        heuristic_score = result.get("heuristic_score", 0.0)
        is_ai = result.get("is_ai_generated", False)
        features = result.get("features", {})
        llm_analysis = result.get("llm_result", result.get("llm_analysis", {}))

        # --- Results ---
        st.subheader("Results")
        col_metric, col_verdict, col_detail = st.columns([1, 1, 1])
        with col_metric:
            st.metric("Combined Score", f"{ai_prob * 100:.1f}%")
            _render_similarity_gauge(ai_prob)
        with col_verdict:
            verdict_text, verdict_class = _ai_verdict(ai_prob)
            st.markdown(f'<p class="{verdict_class}">{verdict_text}</p>', unsafe_allow_html=True)
        with col_detail:
            st.metric("Heuristic Score", f"{heuristic_score * 100:.1f}%")
            llm_conf = llm_analysis.get("confidence", 0.0)
            st.metric("LLM Confidence", f"{float(llm_conf) * 100:.1f}%")

        # Feature breakdown
        if features:
            st.subheader("📊 Feature Breakdown")
            feature_rows = []
            for key, val in features.items():
                display_key = key.replace("_", " ").title()
                if isinstance(val, float):
                    display_val = f"{val:.3f}"
                else:
                    display_val = str(val)
                feature_rows.append({"Feature": display_key, "Value": display_val})

            if feature_rows:
                st.table(feature_rows)

        # LLM reasoning
        if llm_analysis:
            with st.expander("🧠 LLM Reasoning", expanded=True):
                confidence = llm_analysis.get("confidence", None)
                reasoning = llm_analysis.get("reasoning", llm_analysis.get("analysis", ""))
                verdict_llm = llm_analysis.get("verdict", "")

                if confidence is not None:
                    st.metric("LLM Confidence", f"{float(confidence) * 100:.1f}%")
                if verdict_llm:
                    st.info(f"**LLM Verdict:** {verdict_llm}")
                if reasoning:
                    st.markdown(reasoning)


# ===================================================================
# PAGE 3 — Full Analysis
# ===================================================================

def page_full_analysis():
    st.header("📊 Full Analysis")
    st.markdown(
        "Upload **multiple Python files** to run plagiarism checks between all pairs "
        "and AI detection on each file."
    )

    if not _require_api_key():
        pass

    uploaded_files = st.file_uploader(
        "Upload code files",
        type=["py", "txt"],
        accept_multiple_files=True,
        key="full_files",
    )

    if uploaded_files and len(uploaded_files) < 2:
        st.info("Upload at least **2 files** for plagiarism comparison.")

    st.divider()

    if st.button("🔍 Analyze All", type="primary", use_container_width=True):
        if not uploaded_files or len(uploaded_files) < 1:
            st.error("Please upload at least one file.")
            return

        file_map: dict[str, str] = {}
        for f in uploaded_files:
            file_map[f.name] = _read_uploaded_file(f)

        file_names = list(file_map.keys())

        config = _build_config()

        # --- Plagiarism Matrix ---
        if len(file_names) >= 2:
            st.subheader("🔗 Plagiarism Matrix")
            with st.spinner("Computing pairwise similarity…"):
                try:
                    detector = MOSSDetector()
                    n = len(file_names)
                    matrix = [[0.0] * n for _ in range(n)]

                    for i in range(n):
                        matrix[i][i] = 1.0  # self-similarity

                    pairs = list(itertools.combinations(range(n), 2))
                    for i, j in pairs:
                        sim = detector.calculate_similarity(
                            file_map[file_names[i]], file_map[file_names[j]]
                        )
                        matrix[i][j] = sim
                        matrix[j][i] = sim

                    # Display as a table / heatmap
                    _render_heatmap(matrix, file_names)

                    # Flag high-similarity pairs
                    flagged = [(file_names[i], file_names[j], matrix[i][j])
                               for i, j in pairs if matrix[i][j] >= 0.50]
                    if flagged:
                        st.subheader("⚠️ Flagged Pairs")
                        for fa, fb, sim in sorted(flagged, key=lambda x: -x[2]):
                            verdict_text, verdict_class = _plagiarism_verdict(sim)
                            st.markdown(
                                f'<span class="{verdict_class}">{verdict_text}</span> — '
                                f"**{fa}** vs **{fb}**: {sim * 100:.1f}% similarity",
                                unsafe_allow_html=True,
                            )
                    else:
                        st.success("✅ No suspicious pairs detected.")
                except Exception as exc:
                    st.error(f"Plagiarism analysis failed: {exc}")

        # --- AI Detection per file ---
        st.subheader("🤖 AI Detection Results")
        with st.spinner("Running AI detection on each file…"):
            try:
                ai_detector = EmbeddingDetector(config)
                for fname, code in file_map.items():
                    result = ai_detector.detect(code)
                    ai_prob = result.get("combined_score", result.get("ai_probability", 0.0))
                    verdict_text, verdict_class = _ai_verdict(ai_prob)

                    with st.expander(f"{fname} — {verdict_text}  ({ai_prob * 100:.1f}%)", expanded=False):
                        col1, col2 = st.columns([1, 2])
                        with col1:
                            st.metric("AI Probability", f"{ai_prob * 100:.1f}%")
                            _render_similarity_gauge(ai_prob)
                        with col2:
                            st.markdown(f'<p class="{verdict_class}">{verdict_text}</p>', unsafe_allow_html=True)
                            features = result.get("features", {})
                            if features:
                                for key, val in features.items():
                                    display_key = key.replace("_", " ").title()
                                    if isinstance(val, float):
                                        st.caption(f"{display_key}: {val:.3f}")
                                    else:
                                        st.caption(f"{display_key}: {val}")
            except Exception as exc:
                st.error(f"AI detection failed: {exc}")

        # --- Overall report ---
        st.subheader("📋 Overall Report")
        st.info(
            f"Analyzed **{len(file_names)}** files. "
            f"{'Pairwise comparisons: **' + str(len(list(itertools.combinations(file_names, 2)))) + '** pairs.' if len(file_names) >= 2 else ''}"
        )


def _render_heatmap(matrix: list[list[float]], labels: list[str]):
    """Render a similarity matrix as a colored HTML table."""
    n = len(labels)

    def _cell_color(val: float) -> str:
        if val >= 0.75:
            return "#f8d7da"  # red-ish
        elif val >= 0.50:
            return "#fff3cd"  # yellow-ish
        elif val >= 0.25:
            return "#d4edda"  # light green
        return "#ffffff"

    # Truncate long names
    short = [l[:20] for l in labels]

    html = '<table style="border-collapse:collapse; width:100%; text-align:center; font-size:0.85rem;">'
    # Header row
    html += "<tr><th></th>"
    for s in short:
        html += f'<th style="padding:6px; border:1px solid #dee2e6; writing-mode:vertical-lr; transform:rotate(180deg); max-width:40px;">{s}</th>'
    html += "</tr>"

    for i in range(n):
        html += f'<tr><td style="padding:6px; border:1px solid #dee2e6; font-weight:600; text-align:left;">{short[i]}</td>'
        for j in range(n):
            val = matrix[i][j]
            bg = _cell_color(val) if i != j else "#e2e3e5"
            html += (
                f'<td style="padding:6px; border:1px solid #dee2e6; background-color:{bg}; font-weight:600;">'
                f"{val * 100:.0f}%</td>"
            )
        html += "</tr>"
    html += "</table>"

    st.markdown(html, unsafe_allow_html=True)


# ===================================================================
# Router
# ===================================================================

if page == "🔗 Plagiarism Check":
    page_plagiarism()
elif page == "🤖 AI Detection":
    page_ai_detection()
elif page == "📊 Full Analysis":
    page_full_analysis()
