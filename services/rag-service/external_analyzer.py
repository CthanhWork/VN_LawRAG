"""High-level pipeline for external AI assisted legal analysis.

This module sketches out how to combine an external LLM provider (e.g. OpenAI,
Anthropic, Google) with the existing RAG service.  It does not change runtime
behaviour unless you import and invoke it from your application code or create
a companion service.

Typical usage pattern (pseudo):

    from external_analyzer import ExternalCaseAnalyzer
    from app import retrieve2

    analyzer = ExternalCaseAnalyzer()
    events = analyzer.extract_events(long_user_story)
    for ev in events:
        search_queries = analyzer.make_queries(ev)
        rag_context = []
        for q in search_queries:
            rag_context.extend(retrieve2(q, effective_at))
        verdict = analyzer.judge(ev, rag_context)

You can then aggregate all verdicts, render the explanation, and send it back
to the caller.

The methods here favour OpenAI's Chat Completions API.  Replace the bits inside
``_call_llm`` with your preferred provider if needed.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from openai import OpenAI, OpenAIError

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")


@dataclass
class EventSummary:
    """Normalized representation of one legal-relevant event in the story."""

    actors: List[str] = field(default_factory=list)
    action: str = ""
    objects: List[str] = field(default_factory=list)
    intent: Optional[str] = None
    law_hints: List[str] = field(default_factory=list)
    raw_text: str = ""  # original span from the user story


@dataclass
class Verdict:
    decision: str  # VIOLATION | NO_VIOLATION | UNCERTAIN
    explanation: str
    citations: List[Dict[str, Any]]


class ExternalCaseAnalyzer:
    """Wraps external LLM calls for three phases: extract → query → judge."""

    def __init__(self, model: str = DEFAULT_MODEL) -> None:
        self.model = model
        self._client = None

    # ------------------------------------------------------------------
    # LLM helpers
    # ------------------------------------------------------------------
    def _client_openai(self):
        """Lazy init OpenAI client."""
        if self._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY is not set")
            self._client = OpenAI(api_key=api_key)
        return self._client

    def _call_llm(self, system_prompt: str, user_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send a structured request to the external LLM and return JSON."""
        try:
            client = self._client_openai()
            response = client.chat.completions.create(
                model=self.model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
                ],
            )
            raw = response.choices[0].message.content if response.choices else "{}"
            try:
                return json.loads(raw)
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON response: {e}")
                print(f"Raw response: {raw}")
                return {}
        except OpenAIError as e:
            print(f"OpenAI API error: {str(e)}")
            return {}

    # ------------------------------------------------------------------
    # Phase 1: extract structured events from a long-form story
    # ------------------------------------------------------------------
    def extract_events(self, story: str) -> List[EventSummary]:
        """Return a list of focal events to analyse.

        The prompt steers the LLM to identify who did what, to whom, when, and
        which legal domains might be involved.  You can add more fields as
        needed (amounts, places, evidence...).
        """

        if not story.strip():
            return []

        system_prompt = (
            "Bạn là trợ lý pháp lý. Hãy đọc tình huống và liệt kê các sự kiện quan trọng "
            "dưới dạng JSON, tuyệt đối không suy diễn ngoài mô tả."
        )
        payload = {
            "story": story,
            "schema": {
                "events": [
                    {
                        "actors": ["string"],
                        "action": "string",
                        "objects": ["string"],
                        "intent": "string|null",
                        "law_hints": ["string"],
                        "raw_text": "string",
                    }
                ]
            },
        }
        data = self._call_llm(system_prompt, payload)
        events = []
        for item in data.get("events", []):
            events.append(
                EventSummary(
                    actors=list(item.get("actors") or []),
                    action=(item.get("action") or "").strip(),
                    objects=list(item.get("objects") or []),
                    intent=item.get("intent"),
                    law_hints=list(item.get("law_hints") or []),
                    raw_text=(item.get("raw_text") or "").strip(),
                )
            )
        return events

    # ------------------------------------------------------------------
    # Phase 2: transform an event into concrete RAG queries
    # ------------------------------------------------------------------
    def make_queries(self, event: EventSummary) -> List[str]:
        """Map an event to several well-formed legal questions."""

        prompt = (
            "Bạn là chuyên viên tiền xử lý. Với mỗi sự kiện, hãy tạo tối đa 3 câu hỏi "
            "pháp lý ngắn gọn để tra cứu văn bản pháp luật Việt Nam. Trả về JSON."
        )
        payload = {
            "event": event.__dict__,
            "schema": {"queries": ["string"], "law_hints": ["string"]},
        }
        data = self._call_llm(prompt, payload)
        queries = list(data.get("queries") or [])
        # Fallback: simple heuristics if LLM returns nothing
        if not queries and event.action:
            base = f"{event.action} {', '.join(event.objects)}".strip()
            queries.append(base or event.raw_text)
        return [q.strip() for q in queries if q and q.strip()]

    # ------------------------------------------------------------------
    # Phase 3: final judgment using context retrieved from RAG
    # ------------------------------------------------------------------
    def judge(self, event: EventSummary, context: List[Dict[str, Any]], effective_at: str) -> Verdict:
        """Decide whether the event constitutes a violation."""

        system_prompt = (
            "Bạn là chuyên gia pháp lý Việt Nam. Dựa hoàn toàn vào các trích dẫn trong 'context' "
            "(không suy đoán ngoài dữ liệu), hãy kết luận sự kiện có vi phạm không."
        )
        payload = {
            "event": event.__dict__,
            "effective_at": effective_at,
            "context": context,
            "schema": {
                "decision": "VIOLATION|NO_VIOLATION|UNCERTAIN",
                "explanation": "string",
                "citations": [
                    {
                        "law_code": "string",
                        "node_path": "string",
                        "node_id": "number|null",
                    }
                ],
            },
            "rules": [
                "Nếu kết luận VIOLATION phải chỉ ra ít nhất một điều/khoản tương ứng",
                "Nếu dữ liệu không đủ rõ ràng thì chọn UNCERTAIN",
                "Giới hạn giải thích <= 80 từ, tiếng Việt chuẩn",
            ],
        }
        data = self._call_llm(system_prompt, payload)
        decision = data.get("decision") or "UNCERTAIN"
        explanation = data.get("explanation") or "Không đủ căn cứ."
        citations = [
            {
                "law_code": c.get("law_code"),
                "node_path": c.get("node_path"),
                "node_id": c.get("node_id"),
            }
            for c in (data.get("citations") or [])
        ]
        return Verdict(decision=decision, explanation=explanation, citations=citations)


__all__ = ["ExternalCaseAnalyzer", "EventSummary", "Verdict"]

