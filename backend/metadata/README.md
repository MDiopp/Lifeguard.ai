# Local demo-video metadata

`demo_config.json` lives at the project root beside `demo_videos/`. The checked-in
config is intentionally empty: the current local assets are `.mov` files and no
ground-truth swimmer IDs or distress intervals have been supplied. Add a record
only when its annotated `.mp4` exists under `demo_videos/easy/` or
`demo_videos/hard/`.

```json
{
  "videos": {
    "easy_01": {
      "video_id": "easy_01",
      "filename": "easy_01.mp4",
      "relative_path": "demo_videos/easy/easy_01.mp4",
      "difficulty": "easy",
      "distressed_swimmers": [
        {
          "id": "swimmer_1",
          "distress_start": 6.2,
          "distress_end": 13.8,
          "description": null,
          "location": null,
          "expected_track_id": null
        }
      ],
      "notes": null
    }
  }
}
```

Load it through the storage-neutral interface:

```python
from backend.metadata import load_video_metadata

videos = load_video_metadata()
easy_videos = videos.get_by_difficulty("easy")
video = videos.get_by_id("easy_01")
document = video.to_document()
```

The loader rejects duplicate JSON keys, IDs that do not follow the lowercase
underscore convention, unsupported fields, invalid difficulty values, invalid
time intervals, path/filename mismatches, paths outside the project, and missing
video files. Optional descriptive values stay `null`/`None`.

The metadata models use Pydantic v2 with strict types, forbidden unknown fields,
and immutable model instances. They contain metadata and relative paths only;
they never read or store video bytes. `model_dump(mode="json")` and the provided
`to_document()` methods return the nested shape expected by a future MongoDB
repository, while backend services can continue to depend on the
`VideoMetadataRepository` protocol.
