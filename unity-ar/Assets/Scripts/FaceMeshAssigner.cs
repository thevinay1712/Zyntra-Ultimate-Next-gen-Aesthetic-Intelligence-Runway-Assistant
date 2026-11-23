using UnityEngine;
#if UNITY_XR_ARFOUNDATION
using UnityEngine.XR.ARFoundation;
#endif

namespace Zyntra.AR
{
    /// <summary>
    /// Connects Unity AR Foundation ARFaceManager events to the Zyntra AccessoryManager.
    /// Automatically detects user's face, attaches glasses to the nose bridge,
    /// and anchors headwear to the cranial crest with real-time pose tracking.
    /// </summary>
    public class FaceMeshAssigner : MonoBehaviour
    {
#if UNITY_XR_ARFOUNDATION
        [SerializeField] private ARFaceManager faceManager;
#endif
        [Header("Anchor Offsets")]
        [SerializeField] private Vector3 noseBridgeOffset = new Vector3(0f, 0.02f, 0.08f);
        [SerializeField] private Vector3 headTopOffset = new Vector3(0f, 0.12f, 0.02f);

        private void OnEnable()
        {
#if UNITY_XR_ARFOUNDATION
            if (faceManager == null)
            {
                faceManager = FindObjectOfType<ARFaceManager>();
            }

            if (faceManager != null)
            {
                faceManager.facesChanged += OnFacesChanged;
            }
#endif
        }

        private void OnDisable()
        {
#if UNITY_XR_ARFOUNDATION
            if (faceManager != null)
            {
                faceManager.facesChanged -= OnFacesChanged;
            }
#endif
        }

#if UNITY_XR_ARFOUNDATION
        private void OnFacesChanged(ARFacesChangedEventArgs eventArgs)
        {
            // When a new face is tracked, wire anchors to AccessoryManager
            foreach (ARFace face in eventArgs.added)
            {
                ConfigureFaceAnchors(face);
            }

            foreach (ARFace face in eventArgs.updated)
            {
                if (AccessoryManager.Instance != null && AccessoryManager.Instance.faceAnchor == null)
                {
                    ConfigureFaceAnchors(face);
                }
            }
        }

        private void ConfigureFaceAnchors(ARFace face)
        {
            if (AccessoryManager.Instance == null) return;

            // Create face anchor child object if absent
            Transform faceAnchor = face.transform.Find("Zyntra_FaceAnchor");
            if (faceAnchor == null)
            {
                GameObject fObj = new GameObject("Zyntra_FaceAnchor");
                fObj.transform.SetParent(face.transform, false);
                fObj.transform.localPosition = noseBridgeOffset;
                faceAnchor = fObj.transform;
            }

            // Create head/cap anchor child object
            Transform headAnchor = face.transform.Find("Zyntra_HeadAnchor");
            if (headAnchor == null)
            {
                GameObject hObj = new GameObject("Zyntra_HeadAnchor");
                hObj.transform.SetParent(face.transform, false);
                hObj.transform.localPosition = headTopOffset;
                headAnchor = hObj.transform;
            }

            AccessoryManager.Instance.faceAnchor = faceAnchor;
            AccessoryManager.Instance.headAnchor = headAnchor;

            Debug.Log("[Zyntra AR] Face tracking locked! Anchors calibrated.");
        }
#endif
    }
}
