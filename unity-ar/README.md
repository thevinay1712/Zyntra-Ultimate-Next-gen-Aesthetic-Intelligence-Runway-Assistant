# Zyntra AR - Unity 3D & AR Foundation Module
**University Subject: Virtual Reality and Augmented Reality (VR/AR)**  
**Topic:** AR Accessories TRY-ON (Clothing & Apparels)  
**Academic Grading:** 40 Marks Internal + 100 Marks Semester-End  

---

## 1. Overview & Architecture
This module implements the native 3D and Augmented Reality pipeline for **Zyntra AR**, bridging Blender 3D assets to real-time mobile AR tracking (ARCore / ARKit) and interactive WebGL inspection.

```
       [ Blender 3.x / 4.x Asset Creation ]
             |
             v  (.obj / .glb / .fbx)
       [ unity-ar/Assets/Models/ ]
             |
    +--------+------------------------+
    |                                 |
    v                                 v
[ Scene 1: LiveAR_TryOn ]       [ Scene 2: Web3D_TryOn ]
  - AR Foundation 5.x             - Turntable 3D Orbit Cam
  - AR Face Manager (Glasses/Cap) - PBR Shaders & Tinting
  - MediaPipe / AR Body           - React-Unity WebBridge
    |                                 |
    v (Android Build)                 v (WebGL Build)
[ Standalone AR .APK ]          [ client/public/unity-build/ ]
```

---

## 2. Included C# Scripts (`Assets/Scripts/`)
1. **`AccessoryManager.cs`**:
   - Manages equipped 3D accessories (Sunglasses, Cap, Watch, Neck chain) and clothing (Tees, Jeans).
   - Handles dynamic runtime parenting to AR face/body trackable anchors.
   - Provides real-time PBR material color tinting and scale adjustments.
2. **`FaceMeshAssigner.cs`**:
   - Subscribes to `ARFaceManager.facesChanged` events from AR Foundation.
   - Calculates facial landmark offsets for the nose bridge (sunglasses anchor) and cranial top (cap anchor).
3. **`WebBridge.cs`**:
   - Bi-directional communication between the React web app and Unity WebGL.
   - Accepts `EquipItem`, `SetGarmentColor`, and `SetScale` messages from JavaScript.
   - Emits item equip notifications and FPS/telemetry back to the host page.
4. **`OrbitCameraController.cs`**:
   - 360° turntable mouse/touch orbit control with pitch clamping and zoom damping.
5. **`SceneSwitcher.cs`**:
   - Transitions smoothly between mobile AR and turntable viewports.

---

## 3. How to Open and Run in Unity Hub
1. **Prerequisites**: Install **Unity 2022.3 LTS** or **Unity 6 (6000.x)** with Android Build Support.
2. Open Unity Hub → Click **Add project from disk** → Select the `unity-ar` folder.
3. Once loaded, open `Assets/Scenes/LiveAR_TryOn.unity` or `Assets/Scenes/Web3D_TryOn.unity`.

### Building the Android APK (For Mobile AR Live Demo):
1. Go to **File → Build Settings**.
2. Select **Android** and click **Switch Platform**.
3. Ensure `LiveAR_TryOn` is the first scene in the build list.
4. Go to **Project Settings → XR Plug-in Management** → Check **Google ARCore**.
5. Click **Build and Run** with your Android device connected via USB.

### Building WebGL for Zyntra Web Integration:
1. Go to **File → Build Settings** → Select **WebGL** → **Switch Platform**.
2. Go to **Player Settings → WebGL → Publishing Settings**:
   - Set **Compression Format** to **Disabled**.
   - Disable **WebAssembly Streaming**.
3. Set the build output directory to: `client/public/unity-build/`.
4. Run `npm run build` inside `client/`.
