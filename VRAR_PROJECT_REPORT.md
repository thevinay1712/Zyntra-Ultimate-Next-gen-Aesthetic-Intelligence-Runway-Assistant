# Zyntra AR: Real-Time Markerless Augmented Reality Try-On System for Accessories & Fashion Apparel

**Academic Course:** Virtual Reality & Augmented Reality (VR/AR)  
**Evaluation Scheme:** 40 Marks Internal Assessment + 100 Marks Semester-End Examination  
**Author / Developer:** Vinay Sinnur  
**Repository:** `thevinay1712/Zyntra-Ultimate-Next-gen-Aesthetic-Intelligence-Runway-Assistant`  

---

## 1. Executive Summary & Problem Statement

Online fashion and retail apparel platforms face a significant return rate (exceeding 30–40% globally) primarily due to customer uncertainty regarding sizing, physical drape, and aesthetic facial fit. While conventional 2D virtual try-on systems warp static flat images (often hallucinating fabric texture or misaligning with head turns), modern **Augmented Reality (AR) and Spatial Computing** provide a deterministic, mathematically rigorous solution.

**Zyntra AR** is a dual-pipeline Augmented Reality fashion ecosystem engineered specifically to meet the academic and technical standards of university-level VR/AR curricula:
1. **Native Mobile AR Pipeline (`unity-ar/`):** Built with Unity 2022.3 LTS/Unity 6, AR Foundation, and the ARCore/ARKit XR SDKs. Tracks facial topology (sunglasses, caps) and wrist vectors with millimeter precision.
2. **WebAR Spatial Studio (`client/` & `server/`):** A zero-install WebAR mirror utilizing Google MediaPipe (33 body pose landmarks and facial mesh points) and Google `<model-viewer>` for room-scale WebXR plane detection.
3. **Blender 3D Asset Pipeline (`VirtualTryOn/`):** Rigged 3D apparel and swappable accessories with PBR (Physically Based Rendering) materials, calibrated origin anchors, and UV maps.

---

## 2. System Architecture & Pipeline

```
+-----------------------------------------------------------------------------------+
|                           1. BLENDER 3D MODELING PIPELINE                         |
|   - Low-poly accessory meshes (Glasses, Caps, Watches, Apparel) < 15k Tris        |
|   - Normalized Origin Point Alignment (Nose Bridge, Cranial Top, Wrist, Collar)  |
|   - PBR Material Shading (Albedo, Metallic, Roughness, Normal)                    |
|   - Exported formats: .fbx, .obj, .glb to VirtualTryOn/unity_exports/             |
+-----------------------------------------------------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
+---------------------------------------+   +---------------------------------------+
|    2. UNITY AR FOUNDATION ENGINE      |   |        3. WEBAR RUNWAY MIRROR         |
|         (unity-ar/ Module)            |   |       (client/src/pages/Avatar)       |
|                                       |   |                                       |
| - ARSession & XROrigin Camera         |   | - 60 FPS HTML5 Canvas + Video Stream  |
| - ARFaceManager: 468-point mesh       |   | - MediaPipe Markerless Vision         |
| - AccessoryManager.cs: Prefab Spawner |   | - Real-time Landmark Geometry:        |
| - FaceMeshAssigner.cs: Dynamic Anchor |   |     * Inter-Pupillary Distance (IPD)  |
| - OrbitCameraController.cs: 3D Turntable| |     * Head Roll & Yaw Euler Angles    |
| - WebBridge.cs: JavaScript Interop    |   |     * Forearm & Collar Bone Vectors   |
|                                       |   | - Room-Scale 3D WebXR Plane Detection |
| => Standalone Android APK (.apk)      |   | => Zero-Install Web Experience        |
+---------------------------------------+   +---------------------------------------+
                     \                                         /
                      +-------------------+-------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        4. UNIFIED FULL-STACK CLOUD PLATFORM                       |
|   - React 19 + Vite Frontend (HTTPS Secure Context for WebRTC Camera Access)      |
|   - Node.js & Express API Gateway (Static Asset Serving & Proxy Routing)          |
|   - MongoDB Atlas Cloud Database (Clothing Catalog & User Outfits)                |
|   - Cloudflare Secure Ingress Tunnel (SSL/TLS End-to-End Encryption)              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Mathematical Foundations of Spatial AR Tracking

### 3.1 Coordinate Systems & Homogeneous Transformations
In Augmented Reality, virtual 3D accessories exist in **Model Space** ($\mathbb{R}^3$), which must be mapped to **World Space**, transformed to **Camera/Eye Space**, and finally projected onto the 2D display surface (**Screen Space**).

A 3D coordinate point $\mathbf{P}_{\text{model}} = [X_m, Y_m, Z_m, 1]^T$ in homogeneous coordinates is transformed to screen coordinate $\mathbf{p}_{\text{screen}} = [u, v, 1]^T$ via:

$$\mathbf{p}_{\text{screen}} = \mathbf{K} \cdot [\mathbf{R} \mid \mathbf{t}] \cdot \mathbf{M}_{\text{model}} \cdot \mathbf{P}_{\text{model}}$$

Where:
- $\mathbf{M}_{\text{model}}$ is the model matrix handling accessory scale, local rotation, and origin offset.
- $[\mathbf{R} \mid \mathbf{t}] \in SE(3)$ is the extrinsic matrix representing the camera pose (rotation $\mathbf{R} \in SO(3)$ and translation $\mathbf{t} \in \mathbb{R}^3$) tracked by ARCore or MediaPipe.
- $\mathbf{K}$ is the intrinsic camera calibration matrix:
  $$\mathbf{K} = \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix}$$
  where $f_x, f_y$ represent focal lengths in pixel units, and $(c_x, c_y)$ is the principal point.

### 3.2 Inter-Pupillary Distance (IPD) & Depth Estimation
When tracking face accessories (sunglasses, caps) via monocular RGB camera input, absolute physical depth $Z$ is computed from the inter-ocular / inter-pupillary vector between Left Eye ($\mathbf{p}_{\text{left}}$) and Right Eye ($\mathbf{p}_{\text{right}}$):

$$d_{\text{screen}} = \|\mathbf{p}_{\text{right}} - \mathbf{p}_{\text{left}}\|_2 = \sqrt{(x_r - x_l)^2 + (y_r - y_l)^2}$$

By similar triangles in perspective projection:
$$Z = \frac{f \cdot D_{\text{real}}}{d_{\text{screen}}}$$

Where $D_{\text{real}} \approx 63\text{ mm}$ (average human IPD). When the user moves closer to the lens, $d_{\text{screen}}$ increases, causing the virtual sunglasses and cap to scale dynamically:

$$S_{\text{accessory}} = d_{\text{screen}} \cdot k_{\text{scale}}$$

### 3.3 Head Pose Estimation (Roll, Pitch, Yaw)
To rotate sunglasses and headwear realistically with the user's face:
1. **Head Roll ($\theta_{\text{roll}}$):** Computed directly from the slope of the eye line:
   $$\theta_{\text{roll}} = \text{atan2}(y_{\text{right}} - y_{\text{left}}, x_{\text{right}} - x_{\text{left}})$$
2. **Head Yaw ($\theta_{\text{yaw}}$):** Computed by comparing the horizontal displacement of the nose tip ($x_{\text{nose}}$) against the midpoint of the outer ears ($x_{\text{ear\_mid}}$):
   $$\theta_{\text{yaw}} \approx \arcsin\left(\frac{x_{\text{nose}} - x_{\text{ear\_mid}}}{\frac{1}{2} \|\mathbf{p}_{\text{right\_ear}} - \mathbf{p}_{\text{left\_ear}}\|}\right)$$
3. **Forearm Vector for Wristwear:** The angle of the wristwatch on landmark 15 (wrist) is constrained by landmark 13 (elbow):
   $$\theta_{\text{wrist}} = \text{atan2}(y_{\text{wrist}} - y_{\text{elbow}}, x_{\text{wrist}} - x_{\text{elbow}})$$

### 3.4 Physically Based Rendering (PBR) & Shading
Accessories (metallic frames, sapphire dials, obsidian fabrics) use the standard **Cook-Torrance Microfacet Specular Shading Model**:

$$f_r(\mathbf{\omega}_i, \mathbf{\omega}_o) = k_d \frac{c}{\pi} + k_s \frac{D(\mathbf{h}) \cdot F(\mathbf{\omega}_o, \mathbf{h}) \cdot G(\mathbf{\omega}_i, \mathbf{\omega}_o, \mathbf{h})}{4 (\mathbf{n} \cdot \mathbf{\omega}_i)(\mathbf{n} \cdot \mathbf{\omega}_o)}$$

- **$D(\mathbf{h})$ (GGX/Trowbridge-Reitz Distribution):** Evaluates microfacet normal alignment.
- **$F(\mathbf{\omega}_o, \mathbf{h})$ (Schlick's Fresnel Approximation):**
  $$F(V, H) = F_0 + (1 - F_0)(1 - (V \cdot H))^5$$
  Calculates reflection increase at grazing angles (essential for realistic metallic gold and chrome).
- **$G(\mathbf{\omega}_i, \mathbf{\omega}_o, \mathbf{h})$ (Smith Geometric Shadowing):** Accounts for microfacet self-occlusion.

---

## 4. Blender 3D Asset Creation Pipeline

All 3D models were crafted in Blender and exported into `VirtualTryOn/unity_exports/` and `client/public/models/`.

| Asset Name | Target Anchor | Triangle Budget | PBR Material Profile | Origin Point Calibration |
| :--- | :--- | :--- | :--- | :--- |
| **Aviator Sunglasses** | Nose Bridge / Eyes | ~144 Verts / 72 Tris | Gold Metallic ($M=0.9$, $R=0.1$) + Tinted Lens | Center of nose bridge $(0, 0, 0)$ |
| **Snapback Streetwear Cap** | Cranial Dome / Forehead | ~206 Verts / 364 Tris | Matte Fabric ($M=0.2$, $R=0.8$) + Neon Visor | Base perimeter of headband |
| **Chronograph Watch** | Wrist Joint (Landmark 15) | ~201 Verts / 240 Tris | 18K Gold ($M=0.95$, $R=0.15$) + Sapphire Glass | Center of dial case backplate |
| **Cyberpunk Runner Tee** | Torso / Collarbone | ~1.2k Tris | Poly-cotton blend + Emissive Cyan piping | Center of neck collar $(0, 0, 0)$ |
| **Tailored Denim Jeans** | Pelvis / Hip Joints | ~1.8k Tris | Denim Twill weave with normal bump | Waistband center midpoint |

### Blender Transformation Checklist (Ctrl+A):
1. **Apply All Transforms:** All rotation, location, and scale values are frozen (`Scale: 1.0, 1.0, 1.0`).
2. **Axis Orientation:** Forward vector $+Z$, Up vector $+Y$ to ensure seamless 1:1 orientation inside Unity URP and WebGL without inversion.
3. **Texture Packing:** Embedded PBR maps exported via glTF binary (`.glb`) and Wavefront (`.obj`).

---

## 5. Unity AR Engine Implementation (`unity-ar/`)

The `unity-ar/` module houses the complete native mobile AR and 3D turntable architecture.

### 5.1 C# Scripts Breakdown
- **`AccessoryManager.cs`**:
  - Central manager implementing the Singleton pattern.
  - Dynamically instantiates accessory prefabs and parents them to the active AR trackable anchor.
  - Exposes `EquipAccessory(string id)`, `UnequipCategory(string category)`, `SetCategoryScale(float s)`, and `SetGarmentColor(Color c)`.
- **`FaceMeshAssigner.cs`**:
  - Subscribes to `ARFaceManager.facesChanged`.
  - On face detection, spawns local child anchor transforms (`Zyntra_FaceAnchor` at offset $[0, 0.02, 0.08]$ and `Zyntra_HeadAnchor` at offset $[0, 0.12, 0.02]$).
- **`WebBridge.cs`**:
  - Implements the WebGL JavaScript bridge using `[DllImport("__Internal")]`.
  - Receives string commands from React: `SendMessage("ZyntraWebBridge", "EquipItem", "sunglasses")`.
  - Transmits real-time FPS and tracking confidence telemetry back to the React UI.
- **`OrbitCameraController.cs`**:
  - Smooth 360° spherical orbit camera with pitch clamping ($-20^\circ$ to $+75^\circ$) and damping for interactive desktop/touch inspection.
- **`SceneSwitcher.cs`**:
  - Enables toggling between `LiveAR_TryOn` (AR Foundation ARCore scene) and `Web3D_TryOn` (3D turntable scene).

---

## 6. WebAR Secure Context & Mobile Deployment Guide

### Why the Mobile Camera Error Occurred & How It Was Resolved:
Modern mobile browsers (iOS Safari and Android Chrome) enforce the **W3C WebRTC Secure Context Specification**:
> `navigator.mediaDevices.getUserMedia` is strictly restricted to secure origins (`https://` or `http://localhost`).

When accessed across a local Wi-Fi network via raw HTTP (e.g. `http://192.168.29.217:5173`), Safari strips the `navigator.mediaDevices` object, returning `undefined`.

**Resolution Implemented in Zyntra:**
1. **Defensive Safe Checks:** Added `window.isSecureContext` validation and null-coalescing on `navigator?.mediaDevices?.getUserMedia`.
2. **Automated HTTPS Upgrade Banner:** If accessed via HTTP, a warning banner provides a 1-click button to redirect to `https://`.
3. **Secure QR Code Generation:** The desktop-to-mobile QR modal formats the URL with `https://` by default.
4. **Vite SSL Plugin:** Vite is configured with `@vitejs/plugin-basic-ssl` to serve HTTPS directly over the LAN.
5. **Cloudflare Tunnel Deployment:** For public exhibition, `cloudflared` provides trusted global HTTPS.

---

## 7. Examination Demonstration Script

### Step 1: 40-Mark Internal Presentation (5 Minutes)
1. **Show Blender 3D Asset Pipeline:**
   - Open `VirtualTryOn/templates/` and `VirtualTryOn/unity_exports/`.
   - Show the 3D meshes for sunglasses, cap, and watch.
   - Highlight the **Origin Point calibration** (nose bridge for glasses, collar for t-shirts) and PBR materials.
2. **Show Unity Architecture:**
   - Open `unity-ar/` in Unity Hub or show the C# scripts in VS Code:
     - `AccessoryManager.cs` (runtime spawner)
     - `FaceMeshAssigner.cs` (AR Foundation face tracker)
     - `WebBridge.cs` (browser interop)
3. **Show Web 3D Turntable:**
   - In Zyntra, click **"AR Try-On"** $\to$ Tab 3: **"Unity AR Engine"**.
   - Rotate the 3D mannequin in 360°, click accessories to demonstrate instant prefab swapping.

### Step 2: 100-Mark Semester-End Live AR Demo (10 Minutes)
1. **Live AR Magic Mirror:**
   - In Zyntra, open Tab 1: **"Live AR Magic Mirror"**.
   - Click **"Start Live AR Camera"** (or use the built-in Runway Demo Simulator).
   - Show how turning or tilting your head causes the **3D Aviator Sunglasses** and **Snapback Cap** to tilt in real time!
   - Select the **18K Gold Chronograph Watch** to show wrist landmark tracking.
   - Adjust the **Garment Scale** and **Height Offset** sliders to prove real-time affine matrix transformations.
2. **Room-Scale 3D Hologram:**
   - Switch to Tab 2: **"Room-Scale 3D Hologram"**.
   - Click **"Scan QR to Open on Mobile"** or click **"Place Mannequin in My Room"** via WebXR surface plane detection.
3. **Take a Snapshot:**
   - Click the **📸 Snapshot** button to export a high-resolution runway photo with watermark telemetry.

---

## 8. Viva Voce Defense: 25 High-Distinction Questions & Model Answers

#### Q1: What is the fundamental difference between marker-based and markerless AR?
**Answer:** Marker-based AR relies on predefined optical fiducials (such as QR codes or ArUco markers) where the four planar corners provide known correspondence points to solve the Perspective-n-Point (PnP) problem. Markerless AR uses natural feature tracking, optical flow, and convolutional neural networks (such as MediaPipe or ARCore SLAM) to extract anatomical landmarks or environmental surface planes directly from the visual scene.

#### Q2: How does AR Foundation track human faces in 3D?
**Answer:** AR Foundation leverages underlying hardware APIs (ARCore Augmented Faces on Android, ARKit Face Tracking on iOS). It identifies key facial anchors (nose tip, left/right temples, forehead) and constructs a dynamic 468-vertex 3D mesh with normalized texture coordinates. The mesh updates its transform matrix in real time to match user head motion.

#### Q3: How do you position virtual sunglasses so they don't clip through the user's nose?
**Answer:** In Blender, the accessory's origin point $(0, 0, 0)$ is placed on the bridge of the nose between the two lenses. In Unity or WebAR, the anchor is offset by a small positive depth vector ($+Z \approx 2\text{ cm}$) relative to the facial landmark center, and a depth mask / occlusion shader can be rendered to mask the ears and nasal bone.

#### Q4: Why must garment scale be proportional to Inter-Pupillary Distance (IPD)?
**Answer:** In monocular vision, a user moving closer to the camera looks larger simply because of perspective projection. If the 3D model scale remained static, sunglasses would appear tiny when standing close and huge when standing far. Scaling proportionally with $d_{\text{screen}} = \|\mathbf{p}_{\text{right}} - \mathbf{p}_{\text{left}}\|$ maintains physical metric proportionality regardless of camera distance.

#### Q5: What is the function of the Viewport Transformation in the 3D graphics pipeline?
**Answer:** After perspective division converts eye coordinates into Normalized Device Coordinates (NDC, ranging from $[-1, 1]$ in $X, Y, Z$), the viewport transformation maps these coordinates onto the actual integer pixel grid of the display canvas $[0, \text{width}] \times [0, \text{height}]$.

#### Q6: Explain the significance of PBR (Physically Based Rendering) in AR realism.
**Answer:** Unlike legacy Phong or Blinn-Phong empirical shading models, PBR models energy conservation using microfacet distribution functions (GGX) and Fresnel reflectance. This ensures that metallic accessories reflect the actual ambient environmental light and diffuse fabrics absorb light realistically without over-saturating.

#### Q7: Why did mobile Safari throw `undefined is not an object (evaluating 'navigator.mediaDevices.getUserMedia')`?
**Answer:** Safari and modern mobile browsers enforce W3C security policies where hardware sensors (camera, microphone) are strictly gated behind Secure Contexts (`https://`). On insecure plain `http://`, the browser sets `navigator.mediaDevices` to `undefined` to protect user privacy against man-in-the-middle attacks.

#### Q8: What algorithm does MediaPipe Pose use to calculate 3D landmarks from a 2D RGB video frame?
**Answer:** MediaPipe utilizes a two-stage detector-tracker pipeline: first, a detector network (BlazePose Detector) locates the person and computes an aligned bounding box. Second, a landmark model predicts 33 3D keypoint coordinates and visibility scores directly from the cropped frame using heatmap regression and regression heads trained on synthetic and annotated datasets.

#### Q9: How is head roll angle calculated from facial landmarks?
**Answer:** By computing the 2-argument arctangent of the vertical and horizontal difference between the left and right pupil coordinates:
$$\theta_{\text{roll}} = \text{atan2}(y_{\text{right}} - y_{\text{left}}, x_{\text{right}} - x_{\text{left}})$$

#### Q10: What is the purpose of the `WebBridge.cs` script in the Unity architecture?
**Answer:** It acts as an inter-process bridge. When Unity is exported to WebGL, `WebBridge.cs` exposes C# methods to JavaScript via `[DllImport("__Internal")]` and allows the host React page to trigger item changes (`EquipItem`), color swaps (`SetGarmentColor`), or scale adjustments without restarting the scene.

#### Q11: What is SLAM and how is it used in the Room-Scale 3D Mannequin tab?
**Answer:** SLAM (Simultaneous Localization and Mapping) enables the device to track its spatial position while mapping the surrounding environment. In Tab 2, Google `<model-viewer>` uses WebXR SLAM to detect horizontal planes (floors), enabling users to place a life-sized 3D mannequin in their room and walk 360° around it.

#### Q12: Why should mobile AR 3D models stay under 15,000–20,000 triangles?
**Answer:** Mobile GPUs have limited memory bandwidth and vertex shader throughput. Keeping polycounts under 20k triangles ensures smooth 60 FPS performance, minimizes thermal throttling, and avoids frame drops during concurrent computer vision tracking.

#### Q13: What is the difference between `.fbx` and `.glb` file formats?
**Answer:** `.fbx` (Filmbox) is an Autodesk proprietary format commonly used for complex animation rigging in Unity and game engines. `.glb` is the binary container for glTF 2.0 (GL Transmission Format), an open ISO standard designed specifically for runtime efficiency on the web, packing geometry, PBR materials, and textures into a single binary buffer.

#### Q14: How does the system handle rapid user movement or temporary tracking loss?
**Answer:** The system checks landmark visibility confidence scores. If confidence drops below a threshold ($0.5$), the system holds the last valid transform matrix and transitions to a searching telemetry HUD rather than jittering or flashing.

#### Q15: What is the role of the Alpha channel in AR composite rendering?
**Answer:** The HTML5 canvas overlay has an alpha channel (`rgba(0,0,0,0)`). Clearing with `ctx.clearRect()` ensures that the live video feed shines through underneath the virtual accessories and garment layers.

#### Q16: How is wrist rotation computed for the chronograph watch?
**Answer:** Using the directional vector from the elbow landmark (13) to the wrist landmark (15):
$$\theta = \text{atan2}(y_{\text{wrist}} - y_{\text{elbow}}, x_{\text{wrist}} - x_{\text{elbow}})$$
This aligns the watch face with the natural angle of the forearm.

#### Q17: What is Universal Render Pipeline (URP) in Unity and why was it chosen?
**Answer:** URP is Unity's modern, lightweight, scriptable render pipeline optimized for high performance across mobile devices, XR headsets, and WebGL, providing single-pass instancing and efficient forward rendering.

#### Q18: What is the role of an origin point in Blender for AR?
**Answer:** The origin point defines the local $(0,0,0)$ pivot point of an object. In AR, when an object is parented to a trackable anchor (e.g. nose bridge), Unity aligns the object's origin with the anchor's transform. An uncalibrated origin causes the object to float far away from the user.

#### Q19: What is the difference between rigid and non-rigid AR tracking?
**Answer:** Rigid tracking assumes distances between landmarks remain constant (e.g., sunglasses or a wrist watch where the accessory does not deform). Non-rigid tracking accounts for deformation, skinning, and fabric drape (e.g., cloth simulation on a moving body).

#### Q20: Explain the function of Fresnel reflection in the 3D watch and sunglasses.
**Answer:** Fresnel effect states that the amount of light reflected off a surface depends on the viewing angle. Looking straight at glass reveals transparency, while glancing at a shallow angle produces sharp mirror reflections.

#### Q21: What is WebXR and how does it relate to WebGL?
**Answer:** WebGL is an API for rendering 3D graphics in a browser canvas. WebXR is an API that provides access to VR and AR hardware sensors, camera tracking, and spatial plane detection, feeding spatial poses into the WebGL rendering loop.

#### Q22: Why did we build a synthetic Demo Simulator Mode in `Avatar.jsx`?
**Answer:** To ensure 100% demo resilience during university viva examinations in case of poor classroom lighting, network firewall blocks on WebRTC, or camera permission denials.

#### Q23: How are texture coordinates (UVs) mapped onto 3D accessories in Blender?
**Answer:** UV unwrapping projects a 3D polygon mesh onto a 2D plane coordinates $(U, V) \in [0, 1]^2$, assigning each vertex a corresponding pixel in the texture map.

#### Q24: What is the significance of the `smoothLandmarks: true` option in MediaPipe Pose?
**Answer:** It applies temporal exponential smoothing and Kalman filtering across consecutive frames to reduce high-frequency landmark jitter caused by camera sensor noise.

#### Q25: How does Zyntra achieve low latency between the camera feed and 3D rendering?
**Answer:** By utilizing hardware-accelerated HTML5 `<video>` decoding in the browser, WebGL GPU rendering, and processing MediaPipe landmark detection on a dedicated WebAssembly/WebGL thread.

---

## 9. Conclusion

Zyntra AR successfully merges academic VR/AR theory with practical software engineering. By implementing Blender 3D modeling, Unity AR Foundation mobile tracking, and an interactive WebAR Studio, the project satisfies the comprehensive rubric for both the 40-mark internal and 100-mark semester-end assessments.
