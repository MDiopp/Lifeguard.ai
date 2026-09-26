Lifeguard AI Architecture

1. Project Goal

Lifeguard AI is a computer-vision-assisted pool safety system.

The system analyzes pool footage, tracks swimmers, identifies behavior that may indicate distress, and directs human attention toward swimmers who may need help.

The hackathon demo includes a Human vs AI challenge in which a judge attempts to identify swimmers in distress before Lifeguard AI does.

2. High-Level Architecture

The project consists of four main parts:

Frontend

React web application

Responsive desktop/laptop monitoring interface

iPad Human vs AI interface

Results and AI Analysis Replay

Communicates with backend through HTTP and WebSockets

Backend

FastAPI

Coordinates the demo

Serves demo videos

Synchronizes the iPad and laptop

Records judge selections and detection times

Receives AI detection events

Returns results and analysis data to the frontend

Computer Vision / AI

Python

Person / swimmer detection

Swimmer tracking across frames

Pose and movement analysis

Temporal behavioral analysis

Distress-risk scoring

Swimmer description

Approximate pool location

Detection timestamps

Demo Video Storage

Demo videos are stored locally on the laptop

Videos are grouped by difficulty

Metadata is stored separately in JSON/config files

The database, if one is added later, should store metadata rather than raw video files

3. Device Roles

Laptop

The laptop is the primary server and processing device.

It should:

Run the React frontend

Run FastAPI

Run the AI/CV pipeline

Store the demo video files

Store demo metadata

Coordinate demo sessions

Display full results and AI Analysis Replay

iPad

The iPad is the judge-facing demo device.

It should:

Connect to the laptop over the local network

Display the Human vs AI challenge

Play clean pool footage

Allow the judge to tap swimmers

Record judge selections and timing

Avoid showing AI analysis during the challenge

4. High-Level System Flow

General monitoring flow:

Pool video
→ Video ingestion
→ Swimmer detection
→ Swimmer tracking
→ Pose / movement analysis
→ Temporal behavioral features
→ Distress-risk scoring
→ Possible distress event
→ FastAPI
→ Frontend UI

Human vs AI demo flow:

Random challenge video
→ iPad plays clean footage to judge

At the same time:

Same challenge video
→ Lifeguard AI analyzes frames independently

Judge tap
→ iPad sends tap coordinates + timestamp
→ Backend determines selected tracked swimmer

AI detection
→ Backend records swimmer + timestamp

Both results
→ Backend compares performance
→ Results screen
→ AI Analysis Replay

5. Demo Video Storage

The demo should not depend on cloud video storage.

All challenge videos should be stored locally on the laptop.

Recommended folder structure:

demo_videos/
├── easy/
│   ├── easy_01.mp4
│   ├── easy_02.mp4
│   └── easy_03.mp4
│
├── medium/
│   ├── medium_01.mp4
│   ├── medium_02.mp4
│   └── medium_03.mp4
│
└── hard/
├── hard_01.mp4
├── hard_02.mp4
└── hard_03.mp4

Each difficulty level should ideally contain multiple videos so different judges do not always see the same clip.

6. Demo Video Selection

Each round should randomly select a video from the matching difficulty folder.

Suggested behavior:

Round 1

Random video from demo_videos/easy/

Round 2

Random video from demo_videos/medium/

Round 3

Random video from demo_videos/hard/

The system should avoid repeating a video within the same demo session.

Example:

Round 1
→ easy_03.mp4

Round 2
→ medium_01.mp4

Round 3
→ hard_02.mp4

This makes the demo more replayable and prevents nearby judges from easily learning the correct answer.

7. Demo Video Metadata

Ground-truth information should be stored separately from the raw video files.

Recommended file:

demo_config.json

Example:

{
"videos": {
"easy_01.mp4": {
"difficulty": "easy",
"distressed_swimmers": ["swimmer_3"],
"distress_start_times": [6.2]
},

"medium_02.mp4": {
  "difficulty": "medium",
  "distressed_swimmers": ["swimmer_7"],
  "distress_start_times": [8.4]
},

"hard_02.mp4": {
  "difficulty": "hard",
  "distressed_swimmers": ["swimmer_4", "swimmer_9"],
  "distress_start_times": [8.1, 13.4]
}

}
}

Metadata may also contain:

Human-readable swimmer description

Approximate pool location

Expected tracking ID

Notes about the scenario

Correct distress interval

Ground-truth bounding boxes if useful

Precomputed analysis data if needed for reliability

Example:

{
"video": "medium_02.mp4",
"difficulty": "medium",
"distressed_swimmers": [
{
"id": "swimmer_7",
"description": "adult male wearing yellow swim trunks",
"location": "upper-right pool",
"distress_start": 8.4,
"distress_end": 14.9
}
]
}

8. Database Strategy

A database is not required for the first hackathon version.

For the MVP:

Raw videos

Stored as local files

Demo metadata

Stored in JSON/config files

Temporary demo session state

Can be held in memory by FastAPI

A database may be added later for:

Incident history

Detection logs

Judge results

AI predictions

Swimmer descriptions

Replay metadata

User accounts

Camera configuration

If a database is added, the video file itself should usually remain outside the database.

The database should store:

File path
or

Video URL

rather than the raw video binary.

9. Frontend Routes

Suggested routes:

/

Home

Homepage responsibilities:

Brand/marketing entry screen only

Introduce Lifeguard AI at a glance

Provide navigation into /monitor, /demo, and optionally /incidents

Remain independent of live monitoring state

The homepage should NOT render:

Live camera/video feeds

Swimmer tracking overlays

Swimmer counts

Alert counts

Live safety status

Incident data

Distress-risk data

Operational information belongs on the dedicated product routes rather than the homepage.

/monitor

Live Monitoring

/demo

Human vs AI challenge

/incidents

Incident History

/analysis/:incidentId

AI Analysis Replay

Distress detection should generally be a state of the Monitoring page rather than a separate route.

10. Frontend Responsibilities

The homepage should remain a lightweight visual entry point and must not depend on backend/CV data to render.

The frontend is responsible for:

Rendering video

Displaying monitoring state

Displaying swimmer tracking information

Showing distress alerts

Running the Human vs AI interaction

Recording judge tap coordinates

Displaying results

Rendering AI Analysis Replay

Responsive behavior across laptop, iPad, and phone

The frontend should not contain the core distress-detection logic.

11. Backend Responsibilities

FastAPI is responsible for:

Serving demo videos

Selecting random round videos

Loading video metadata

Coordinating demo sessions

Receiving judge selections

Recording timestamps

Receiving AI detection events

Synchronizing laptop and iPad

Providing results data

Providing analysis/replay data

Managing WebSocket connections

12. Computer Vision / AI Responsibilities

The CV pipeline should ideally output:

Track ID

Bounding box

Timestamp

Approximate swimmer position

Pose information

Movement features

Behavioral features

Risk score

Alert status

Optional visual description

Example output:

{
"track_id": 7,
"timestamp": 8.42,
"bbox": [x1, y1, x2, y2],
"location": "upper-right pool",
"description": "adult male wearing yellow swim trunks",
"risk_score": 0.84,
"signals": [
"limited forward movement",
"sustained vertical posture",
"irregular arm motion"
],
"status": "possible_distress"
}

13. Computer Vision Stack

Astra may choose the exact models/libraries used for the hackathon implementation.

Preferred architecture:

Pretrained person / pose detection model

Persistent multi-object tracking

Custom temporal behavioral analysis

Explainable distress-risk scoring

Suggested starting point:

YOLO pose model

Detect people

Estimate body keypoints

ByteTrack or similar tracker

Maintain swimmer identities across frames

Custom Python temporal analysis

Analyze movement and posture over time

Produce risk scores and possible-distress events

Do not train a custom model from scratch unless absolutely necessary.

Prioritize:

Real-time performance

Reliability

Ease of integration

Explainability

Hackathon development speed

The AI implementation should remain replaceable later.

14. Distress Detection Philosophy

The system should not claim certainty that a swimmer is drowning.

Preferred states:

Normal

Monitoring

Possible Distress

Critical Attention

Risk should ideally be based on multiple signals over time rather than a single frame.

Possible signals include:

Reduced forward movement

Sustained vertical posture

Unusual arm movement

Sudden movement change

Extended low movement

Abnormal trajectory

Temporal persistence of suspicious behavior

Demo thresholds may be tuned for the hackathon and should not be presented as clinically validated drowning criteria.

15. Judge Tap Selection

When the judge taps the video:

Record tap coordinates.

Convert them into normalized video coordinates.

Record the video timestamp.

Compare the tap point with tracked swimmer bounding boxes at that timestamp.

Resolve the selected swimmer.

Store the result.

Normalized coordinates:

x = tap_x / displayed_video_width
y = tap_y / displayed_video_height

This allows selection to work regardless of the screen size.

The judge should be able to tap directly on swimmers rather than selecting numbered buttons or IDs.

16. Human vs AI Session Data

For each round, record:

Selected video

Difficulty

Round start time

Judge selected swimmer

Judge detection time

AI selected swimmer

AI detection time

Ground-truth swimmer(s)

Correct / incorrect judge selection

Correct / incorrect AI selection

For difficult multi-target rounds, also record:

Correct detections

Missed swimmers

False positives

17. Real-Time Communication

Use WebSockets for real-time events such as:

Demo session created

Round started

Video selected

Video synchronized

Judge submitted selection

AI detected possible distress

Round completed

Results available

REST endpoints may be used for:

Incident history

Static configuration

Loading prior analysis

Loading demo metadata

Non-time-sensitive data

18. Demo Networking

The demo should not depend on venue Wi-Fi.

Preferred setup:

Laptop
→ hosts local network / hotspot

iPad
→ connects to laptop network

FastAPI
→ runs on laptop and listens on the local network

The demo should work offline whenever possible.

19. Demo Reliability

Hackathon reliability is more important than architectural complexity.

Important rules:

Store all challenge videos locally.

Preload challenge videos where practical.

Avoid unnecessary cloud dependencies.

Cache or precompute data where useful.

Have fallback demo data available.

Ensure one complete Human vs AI round works end-to-end before adding complexity.

Prefer a controlled, reliable demo over a fragile fully dynamic implementation.

If real-time AI analysis becomes unreliable, precomputed per-video AI analysis may be used as a fallback while preserving the same frontend/replay experience.

20. Development Priority

Build in this order:

Local demo video storage

Random video selection by difficulty

One end-to-end Human vs AI round

AI/CV analysis working on one video

Judge tap selection

Results comparison

AI Analysis Replay

Additional demo videos

Additional rounds

Monitoring interface

Visual polish and animations

Optional features

The first full demo round should work as early as possible.

21. AI Coding Instructions

When modifying the project:

Read this architecture document before making major technical decisions.

Read the design specification before making major visual decisions.

Preserve separation between frontend, backend, and CV responsibilities.

Do not introduce unnecessary frameworks or infrastructure.

Favor hackathon reliability and development speed.

Avoid unnecessary abstraction.

Keep components modular enough to replace individual parts later.

Document important model/library choices.

Ask before making major architectural changes.