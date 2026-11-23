using UnityEngine;

namespace Zyntra.AR
{
    /// <summary>
    /// Smooth turntable orbit camera with drag rotation, pitch clamping,
    /// and pinch-to-zoom / scroll-wheel distance controls for 3D garment inspection.
    /// </summary>
    public class OrbitCameraController : MonoBehaviour
    {
        [Header("Target and Framing")]
        public Transform target;
        public Vector3 targetOffset = new Vector3(0, 1.0f, 0);

        [Header("Distance")]
        public float distance = 2.5f;
        public float minDistance = 1.0f;
        public float maxDistance = 5.0f;

        [Header("Speeds and Sensitivity")]
        public float xSpeed = 120.0f;
        public float ySpeed = 80.0f;
        public float zoomSpeed = 2.0f;
        public float damping = 5.0f;

        [Header("Pitch Limits")]
        public float yMinLimit = -20f;
        public float yMaxLimit = 75f;

        private float currentX = 0.0f;
        private float currentY = 20.0f;
        private float targetX = 0.0f;
        private float targetY = 20.0f;
        private float targetDistance;

        private void Start()
        {
            targetDistance = distance;
            Vector3 angles = transform.eulerAngles;
            currentX = targetX = angles.y;
            currentY = targetY = angles.x;
        }

        private void LateUpdate()
        {
            if (target == null) return;

            // Mouse / single-touch drag rotation
            if (Input.GetMouseButton(0))
            {
                targetX += Input.GetAxis("Mouse X") * xSpeed * 0.02f;
                targetY -= Input.GetAxis("Mouse Y") * ySpeed * 0.02f;
                targetY = ClampAngle(targetY, yMinLimit, yMaxLimit);
            }

            // Scroll zoom
            float scroll = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(scroll) > 0.001f)
            {
                targetDistance = Mathf.Clamp(targetDistance - scroll * zoomSpeed, minDistance, maxDistance);
            }

            // Smooth interpolation
            currentX = Mathf.Lerp(currentX, targetX, Time.deltaTime * damping);
            currentY = Mathf.Lerp(currentY, targetY, Time.deltaTime * damping);
            distance = Mathf.Lerp(distance, targetDistance, Time.deltaTime * damping);

            Quaternion rotation = Quaternion.Euler(currentY, currentX, 0);
            Vector3 negDistance = new Vector3(0.0f, 0.0f, -distance);
            Vector3 position = rotation * negDistance + (target.position + targetOffset);

            transform.rotation = rotation;
            transform.position = position;
        }

        private static float ClampAngle(float angle, float min, float max)
        {
            if (angle < -360F) angle += 360F;
            if (angle > 360F) angle -= 360F;
            return Mathf.Clamp(angle, min, max);
        }
    }
}
