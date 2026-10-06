# RoomScan 3D

A React Native application for capturing rooms and reconstructing them as 3D models.

Capture stays on the phone. Reconstruction runs on the FastAPI service in `../backend`. The viewer loads the GLB that service writes. It does not draw a stand-in room.

## Current functionality

- Home, scan instructions, live camera capture, and photo review
- Upload of the captured photos to the reconstruction API
- A processing screen that polls the real COLMAP / Open3D job
- A 3D viewer that loads the returned GLB (orbit, pinch zoom, pan, fit, reset)
- Scan history from the API

## Architecture

```
React Native / Expo
  → FastAPI  (../backend)
  → COLMAP sparse reconstruction
  → Open3D mesh
  → GLB
  → Expo GL viewer
```

Screens talk to the Zustand store. The store calls `ScanService`. `src/services/index.ts` binds that interface to `ApiScanService`.

The API base URL is `EXPO_PUBLIC_API_URL`, or `http://<expo-dev-host>:8000` when that variable is unset.

## Technology stack

- Expo SDK 57 and Expo Router
- React Native and TypeScript
- Zustand
- Expo Camera and Expo Image Picker
- Expo GL and Three.js
- FastAPI, COLMAP, and Open3D

WebGPU is not used. It does not run in Expo Go.

## How to run

Start the backend first. See `../backend/README.md`.

From this directory:

```bash
npm install
npx expo start
```

Open the project in Expo Go on the same Wi-Fi as the computer running the API. Camera capture needs a physical device.

A scan needs at least 6 overlapping photos. COLMAP then has to register those photos. If it cannot, the processing screen shows the reconstruction error instead of a model.
# 3d_model
