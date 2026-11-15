from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ...core.media import load_image_ref
from ...core.models import resolve_model
from ...drivers.base import InputImage, VideoRequest
from ...errors import NotFound
from ...services.container import Services
from ...services.tasks import Task
from ..deps import get_services, public_base, require_api_key
from ..schemas import VideoCreateRequest

router = APIRouter(tags=["videos"], dependencies=[Depends(require_api_key)])


def _task_view(task: Task) -> dict:
    view = {
        "id": task.id,
        "object": "video",
        "status": task.status.value,
        "progress": task.progress,
        "created_at": int(task.created_at),
        "model": task.request.get("model"),
        "result": task.result,
        "error": task.error,
    }
    # Infinity Studio: the canvas reads url / video_url at the top level of the task.
    if isinstance(task.result, dict) and task.result.get("url"):
        view["url"] = view["video_url"] = task.result["url"]
    return view


@router.post("/v1/videos")
async def create_video(request: Request, svc: Services = Depends(get_services)) -> dict:
    # Infinity Studio: accept multipart form (what the canvas sends) as well as JSON.
    ctype = request.headers.get("content-type", "")
    first_blob: tuple[bytes, str] | None = None
    if ctype.startswith("multipart/form-data"):
        form = await request.form()
        data = {k: form.get(k) for k in ("model", "prompt", "size", "seconds", "duration")
                if form.get(k) not in (None, "")}
        for key in ("first_frame", "image[]", "image"):
            up = form.get(key)
            if up is not None and hasattr(up, "read"):
                first_blob = (await up.read(), getattr(up, "content_type", None) or "image/png")
                break
        body = VideoCreateRequest(**data)
    else:
        body = VideoCreateRequest(**(await request.json()))
    request.state.model = body.model  # logged even if it does not resolve
    spec = resolve_model(body.model, "video")
    request.state.model = body.model or spec.id
    frame_ref = body.image or body.input_reference
    if first_blob is not None:
        first_frame = InputImage(*first_blob)
    else:
        first_frame = InputImage(*(await load_image_ref(frame_ref))) if frame_ref else None
    base = public_base(request)

    async def runner(progress) -> dict:
        req = VideoRequest(prompt=body.prompt, model=spec.id, size=body.size,
                           duration=body.duration or body.seconds, first_frame=first_frame,
                           timeout=svc.settings.video_timeout, on_progress=progress)
        result = await svc.gateway.generate_video(req)
        name = svc.media.save(result.data, result.mime, prefix="vid")
        return {"url": f"{base}/v1/media/{name}", "mime": result.mime,
                "width": result.width, "height": result.height}

    request_meta = {"model": spec.id, "prompt": body.prompt, "size": body.size,
                    "duration": body.duration or body.seconds, "has_first_frame": bool(first_frame)}
    task = svc.tasks.submit("video", request_meta, runner)
    request.state.task_id = task.id
    return _task_view(task)


@router.get("/v1/videos/{task_id}")
async def get_video(task_id: str, request: Request,
                    svc: Services = Depends(get_services)) -> dict:
    task = svc.tasks.get(task_id)
    if task is None or task.kind != "video":
        raise NotFound(f"video task '{task_id}' not found")
    request.state.model = task.request.get("model")
    return _task_view(task)
