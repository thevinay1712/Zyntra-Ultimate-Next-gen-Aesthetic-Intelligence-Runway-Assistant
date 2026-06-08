import cv2
import numpy as np

try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.5
    )
except Exception as e:
    mp_pose = None
    pose = None
    print(f"Warning: mediapipe initialization failed. Using mock scaling. Error: {e}")

def extract_body_scaling(img_bgr: np.ndarray, height: str = None, weight: str = None, details: str = None) -> dict:
    """
    Extracts pose landmarks using MediaPipe and calculates a 3D scaling matrix.
    Returns scaling vectors for X, Y, Z to apply to the base 3D mesh.
    """
    # Default fallback scale if no pose detected or mediapipe not available
    scale = {"x": 1.0, "y": 1.0, "z": 1.0}
    
    # Helper to apply basic modifiers based on height and weight if provided
    def apply_modifiers(base_scale):
        if height:
            try:
                h_val = float(height)
                # Average height = 170cm
                base_scale["y"] *= (h_val / 170.0)
            except ValueError:
                pass
        
        if weight:
            try:
                w_val = float(weight)
                # Average weight = 70kg
                # Weight affects width and depth more than height
                weight_modifier = (w_val / 70.0)
                base_scale["x"] *= weight_modifier
                base_scale["z"] *= weight_modifier
            except ValueError:
                pass
        return base_scale

    if pose is None:
        return apply_modifiers(scale)

    results = pose.process(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Calculate shoulder width (distance between left and right shoulder)
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        shoulder_width = np.sqrt(
            (left_shoulder.x - right_shoulder.x)**2 +
            (left_shoulder.y - right_shoulder.y)**2 +
            (left_shoulder.z - right_shoulder.z)**2
        )
        
        # Calculate torso height (distance from mid-shoulder to mid-hip)
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
        
        mid_shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
        mid_hip_y = (left_hip.y + right_hip.y) / 2
        torso_height = abs(mid_hip_y - mid_shoulder_y)
        
        # Base normalization values (arbitrary averages for scaling base mesh)
        base_shoulder_width = 0.25 
        base_torso_height = 0.40
        
        # Compute scaling factors
        scale_x = shoulder_width / base_shoulder_width
        scale_y = torso_height / base_torso_height
        scale_z = scale_x * 0.9 # Depth usually correlates with width roughly

        # Apply basic modifiers based on height and weight if provided
        if height:
            try:
                h_val = float(height)
                # Average height = 170cm
                scale_y *= (h_val / 170.0)
            except ValueError:
                pass
        
        if weight:
            try:
                w_val = float(weight)
                # Average weight = 70kg
                # Weight affects width and depth more than height
                weight_modifier = (w_val / 70.0) ** 0.5
                scale_x *= weight_modifier
                scale_z *= weight_modifier
            except ValueError:
                pass
        
        scale = {
            "x": float(np.clip(scale_x, 0.8, 1.2)),
            "y": float(np.clip(scale_y, 0.8, 1.2)),
            "z": float(np.clip(scale_z, 0.8, 1.2))
        }
        
    return scale
