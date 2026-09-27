from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from backend.metadata import (
    CameraViewLocation,
    ConfigFileNotFoundError,
    Difficulty,
    DuplicateIdError,
    JsonVideoMetadataRepository,
    MalformedConfigError,
    MetadataValidationError,
    VideoFileNotFoundError,
    VideoNotFoundError,
    load_video_metadata,
)


def valid_video(video_id: str = "easy_01", difficulty: str = "easy") -> dict:
    return {
        "video_id": video_id,
        "filename": f"{video_id}.mp4",
        "relative_path": f"demo_videos/{difficulty}/{video_id}.mp4",
        "difficulty": difficulty,
        "distressed_swimmers": [
            {
                "id": "swimmer_1",
                "description": None,
                "camera_view_location": None,
            }
        ],
        "ai_answer_time_range": {"minimum": 8.0, "maximum": 10.0},
        "notes": None,
    }


class VideoMetadataRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "demo_videos" / "easy").mkdir(parents=True)
        (self.root / "demo_videos" / "hard").mkdir(parents=True)
        (self.root / "demo_videos" / "easy" / "easy_01.mp4").touch()
        (self.root / "demo_videos" / "hard" / "hard_01.mp4").touch()
        self.config_path = self.root / "demo_config.json"

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def write_config(self, config: dict) -> None:
        self.config_path.write_text(json.dumps(config), encoding="utf-8")

    def test_queries_valid_metadata_and_exports_mongo_ready_documents(self) -> None:
        easy = valid_video()
        hard = valid_video("hard_01", "hard")
        hard["distressed_swimmers"][0]["id"] = "swimmer_9"
        hard["distressed_swimmers"][0]["description"] = "swimmer in yellow cap"
        self.write_config({"videos": {"easy_01": easy, "hard_01": hard}})

        repository = JsonVideoMetadataRepository(
            self.config_path, project_root=self.root
        )

        self.assertEqual(
            [video.video_id for video in repository.get_all()],
            ["easy_01", "hard_01"],
        )
        self.assertEqual(
            repository.get_by_difficulty("easy"),
            (repository.get_by_id("easy_01"),),
        )
        self.assertEqual(
            repository.get_by_difficulty(Difficulty.HARD)[0].video_id,
            "hard_01",
        )
        document = repository.get_by_id("easy_01").to_document()
        self.assertIsNone(document["notes"])
        self.assertIsNone(document["distressed_swimmers"][0]["description"])
        self.assertEqual(document["difficulty"], "easy")
        self.assertEqual(document["ai_answer_time_range"]["minimum"], 8.0)

    def test_checked_in_config_loads_annotated_videos(self) -> None:
        repository = load_video_metadata()
        self.assertEqual(
            [video.video_id for video in repository.get_all()],
            ["easy_01", "easy_02", "easy_03", "easy_04", "hard_01", "hard_02", "hard_03", "hard_04"],
        )
        easy_swimmer = repository.get_by_id("easy_01").distressed_swimmers[0]
        hard_swimmer = repository.get_by_id("hard_01").distressed_swimmers[0]
        self.assertEqual(easy_swimmer.description, "Black girl in pink suit")
        self.assertEqual(
            easy_swimmer.camera_view_location,
            CameraViewLocation.MIDDLE_RIGHT,
        )
        easy_two = repository.get_by_id("easy_02")
        self.assertEqual(easy_two.distressed_swimmers[0].description, "Girl/woman in black")
        self.assertEqual(
            easy_two.distressed_swimmers[0].camera_view_location,
            CameraViewLocation.MIDDLE_TOP_RIGHT,
        )
        easy_three = repository.get_by_id("easy_03")
        self.assertEqual(easy_three.distressed_swimmers[0].description, "Black boy")
        self.assertEqual(
            easy_three.distressed_swimmers[0].camera_view_location,
            CameraViewLocation.MIDDLE_TOP_RIGHT,
        )
        self.assertEqual(easy_three.ai_answer_time_range.minimum, 10.0)
        self.assertEqual(easy_three.ai_answer_time_range.maximum, 12.0)
        easy_four = repository.get_by_id("easy_04")
        self.assertEqual(easy_four.distressed_swimmers[0].description, "Black boy")
        self.assertEqual(
            easy_four.distressed_swimmers[0].camera_view_location,
            CameraViewLocation.MIDDLE_TOP_MIDDLE,
        )
        self.assertEqual(easy_four.ai_answer_time_range.minimum, 21.0)
        self.assertEqual(easy_four.ai_answer_time_range.maximum, 23.0)
        self.assertEqual(hard_swimmer.description, "Girl/woman")
        self.assertEqual(
            hard_swimmer.camera_view_location,
            CameraViewLocation.MIDDLE_TOP_LEFT,
        )
        hard_one = repository.get_by_id("hard_01")
        self.assertIsNone(hard_one.simulated_ai_answer.answer)
        self.assertFalse(hard_one.simulated_ai_answer.correct)
        hard_two = repository.get_by_id("hard_02")
        self.assertEqual(hard_two.distressed_swimmers[0].description, "Big black boy")
        self.assertEqual(
            hard_two.distressed_swimmers[0].camera_view_location,
            CameraViewLocation.MIDDLE_TOP_MIDDLE_LEFT,
        )
        self.assertEqual(hard_two.ai_answer_time_range.minimum, 25.0)
        self.assertEqual(hard_two.ai_answer_time_range.maximum, 27.0)
        hard_three = repository.get_by_id("hard_03")
        self.assertEqual(hard_three.distressed_swimmers[0].description, "Black boy/man")
        self.assertEqual(
            hard_three.distressed_swimmers[0].camera_view_location,
            CameraViewLocation.MIDDLE_CENTER,
        )
        self.assertEqual(hard_three.ai_answer_time_range.minimum, 10.0)
        self.assertEqual(hard_three.ai_answer_time_range.maximum, 12.0)
        self.assertEqual(hard_three.simulated_ai_answer.answer, "White girl in middle")
        self.assertFalse(hard_three.simulated_ai_answer.correct)
        hard_four = repository.get_by_id("hard_04")
        self.assertEqual(hard_four.distressed_swimmers[0].description, "Black boy in orange")
        self.assertEqual(
            hard_four.distressed_swimmers[0].camera_view_location,
            CameraViewLocation.MIDDLE_LEFT,
        )
        self.assertEqual(hard_four.ai_answer_time_range.minimum, 12.0)
        self.assertEqual(hard_four.ai_answer_time_range.maximum, 14.0)
        self.assertEqual(repository.get_by_id("easy_01").ai_answer_time_range.minimum, 12.0)
        self.assertEqual(repository.get_by_id("hard_01").ai_answer_time_range.maximum, 20.0)

    def test_missing_config_has_clear_error(self) -> None:
        with self.assertRaisesRegex(ConfigFileNotFoundError, "config not found"):
            JsonVideoMetadataRepository(self.root / "missing.json")

    def test_malformed_json_reports_location(self) -> None:
        self.config_path.write_text('{"videos": ', encoding="utf-8")
        with self.assertRaisesRegex(MalformedConfigError, "line 1, column"):
            JsonVideoMetadataRepository(self.config_path)

    def test_duplicate_json_video_key_is_rejected_before_data_is_lost(self) -> None:
        video = json.dumps(valid_video())
        self.config_path.write_text(
            f'{{"videos": {{"easy_01": {video}, "easy_01": {video}}}}}',
            encoding="utf-8",
        )
        with self.assertRaisesRegex(DuplicateIdError, "duplicate JSON key"):
            JsonVideoMetadataRepository(self.config_path)

    def test_invalid_or_mismatched_video_id_is_rejected(self) -> None:
        for video_id in ("Easy 01", "easy__01"):
            with self.subTest(video_id=video_id):
                video = valid_video()
                video["video_id"] = video_id
                self.write_config({"videos": {"easy_01": video}})
                with self.assertRaises(MetadataValidationError):
                    JsonVideoMetadataRepository(self.config_path)
        video = valid_video()
        video["video_id"] = "easy_02"
        self.write_config({"videos": {"easy_01": video}})
        with self.assertRaisesRegex(MetadataValidationError, "must match its config key"):
            JsonVideoMetadataRepository(self.config_path)

    def test_duplicate_swimmer_ids_are_rejected(self) -> None:
        video = valid_video()
        video["distressed_swimmers"].append(dict(video["distressed_swimmers"][0]))
        self.write_config({"videos": {"easy_01": video}})
        with self.assertRaisesRegex(DuplicateIdError, "duplicate swimmer ID"):
            JsonVideoMetadataRepository(self.config_path)

    def test_difficulty_and_time_constraints_are_enforced(self) -> None:
        invalid_cases = [
            ("difficulty", "medium", "difficulty"),
            ("answer_minimum", -1.0, "greater than or equal to 0"),
            ("answer_maximum", 7.0, "greater than or equal to minimum"),
        ]
        for field, value, message in invalid_cases:
            with self.subTest(field=field):
                video = valid_video()
                if field == "difficulty":
                    video[field] = value
                elif field == "answer_minimum":
                    video["ai_answer_time_range"]["minimum"] = value
                elif field == "answer_maximum":
                    video["ai_answer_time_range"]["maximum"] = value
                self.write_config({"videos": {"easy_01": video}})
                with self.assertRaisesRegex(MetadataValidationError, message):
                    JsonVideoMetadataRepository(self.config_path)

    def test_pydantic_models_reject_unknown_fields_and_type_coercion(self) -> None:
        video = valid_video()
        video["unexpected"] = True
        self.write_config({"videos": {"easy_01": video}})
        with self.assertRaisesRegex(MetadataValidationError, "Extra inputs"):
            JsonVideoMetadataRepository(self.config_path)

        video = valid_video()
        video["ai_answer_time_range"]["minimum"] = "6.2"
        self.write_config({"videos": {"easy_01": video}})
        with self.assertRaisesRegex(MetadataValidationError, "valid number"):
            JsonVideoMetadataRepository(self.config_path)

    def test_missing_referenced_video_file_is_rejected(self) -> None:
        video = valid_video("easy_02")
        self.write_config({"videos": {"easy_02": video}})
        with self.assertRaisesRegex(VideoFileNotFoundError, "was not found"):
            JsonVideoMetadataRepository(self.config_path, project_root=self.root)

    def test_paths_must_match_the_difficulty_directory(self) -> None:
        video = valid_video()
        video["relative_path"] = "demo_videos/hard/easy_01.mp4"
        self.write_config({"videos": {"easy_01": video}})
        with self.assertRaisesRegex(MetadataValidationError, "relative_path must be"):
            JsonVideoMetadataRepository(self.config_path, project_root=self.root)

    def test_unknown_video_id_and_difficulty_raise_clear_errors(self) -> None:
        self.write_config({"videos": {"easy_01": valid_video()}})
        repository = JsonVideoMetadataRepository(self.config_path, project_root=self.root)
        with self.assertRaisesRegex(VideoNotFoundError, "video ID not found"):
            repository.get_by_id("missing")
        with self.assertRaisesRegex(MetadataValidationError, "easy.*hard"):
            repository.get_by_difficulty("medium")


if __name__ == "__main__":
    unittest.main()
