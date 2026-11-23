using System;
using System.Collections.Generic;
using UnityEngine;

namespace Zyntra.AR
{
    /// <summary>
    /// Zyntra AR Studio - Core Accessory & Apparel Runtime Controller
    /// Handles real-time equipping, scaling, material tinting, and positioning
    /// of 3D accessories (glasses, hats, watches, chains) and apparel onto the AR trackable anchors.
    /// </summary>
    public class AccessoryManager : MonoBehaviour
    {
        public static AccessoryManager Instance { get; private set; }

        [System.Serializable]
        public class AccessoryItem
        {
            public string itemId;
            public string category; // "glasses", "headwear", "wrist", "neck", "top", "bottom"
            public GameObject prefab;
            public Vector3 localOffset = Vector3.zero;
            public Vector3 localEulerRotation = Vector3.zero;
            public float defaultScale = 1.0f;
        }

        [Header("Accessory Database")]
        [SerializeField] private List<AccessoryItem> accessories = new List<AccessoryItem>();

        [Header("Anchor Transform References")]
        [Tooltip("Parent transform for face-anchored items (nose/eyes) provided by ARFace")]
        public Transform faceAnchor;
        [Tooltip("Parent transform for head/cap-anchored items")]
        public Transform headAnchor;
        [Tooltip("Parent transform for wrist-anchored items")]
        public Transform wristAnchor;
        [Tooltip("Parent transform for avatar / turntable body apparel")]
        public Transform avatarTorsoAnchor;

        // Currently spawned active instances
        private readonly Dictionary<string, GameObject> activeInstances = new Dictionary<string, GameObject>();

        // Current scales per category
        private readonly Dictionary<string, float> categoryScales = new Dictionary<string, float>();

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Equip default high-impact starter look if prefabs assigned
            if (accessories.Count > 0)
            {
                EquipAccessory(accessories[0].itemId);
            }
        }

        /// <summary>
        /// Equip an accessory or apparel item by unique identifier.
        /// Replaces any existing item within the same category.
        /// </summary>
        public void EquipAccessory(string itemId)
        {
            AccessoryItem item = accessories.Find(a => a.itemId.Equals(itemId, StringComparison.OrdinalIgnoreCase));
            if (item == null || item.prefab == null)
            {
                Debug.LogWarning($"[Zyntra AR] Item '{itemId}' not found in registered accessories.");
                return;
            }

            // Remove existing item in this category
            UnequipCategory(item.category);

            // Determine appropriate target anchor
            Transform targetAnchor = ResolveAnchor(item.category);
            if (targetAnchor == null)
            {
                targetAnchor = transform; // Fallback to this GameObject
            }

            // Instantiate prefab
            GameObject newObj = Instantiate(item.prefab, targetAnchor);
            newObj.transform.localPosition = item.localOffset;
            newObj.transform.localEulerAngles = item.localEulerRotation;

            float currentScale = categoryScales.ContainsKey(item.category) ? categoryScales[item.category] : item.defaultScale;
            newObj.transform.localScale = Vector3.one * currentScale;

            activeInstances[item.category] = newObj;
            Debug.Log($"[Zyntra AR] Successfully equipped '{item.itemId}' under anchor '{targetAnchor.name}'.");

            // Notify WebBridge / UI
            if (WebBridge.Instance != null)
            {
                WebBridge.Instance.NotifyItemEquipped(item.itemId, item.category);
            }
        }

        /// <summary>
        /// Unequip current item in a specific category.
        /// </summary>
        public void UnequipCategory(string category)
        {
            if (activeInstances.TryGetValue(category, out GameObject currentObj))
            {
                if (currentObj != null)
                {
                    Destroy(currentObj);
                }
                activeInstances.Remove(category);
            }
        }

        /// <summary>
        /// Dynamically scale equipped item in category (e.g. from UI slider).
        /// </summary>
        public void SetCategoryScale(string category, float scaleMultiplier)
        {
            categoryScales[category] = scaleMultiplier;
            if (activeInstances.TryGetValue(category, out GameObject currentObj) && currentObj != null)
            {
                currentObj.transform.localScale = Vector3.one * scaleMultiplier;
            }
        }

        /// <summary>
        /// Dynamically set PBR color tint of an equipped garment or accessory.
        /// </summary>
        public void SetGarmentColor(string category, Color newColor)
        {
            if (activeInstances.TryGetValue(category, out GameObject currentObj) && currentObj != null)
            {
                Renderer[] renderers = currentObj.GetComponentsInChildren<Renderer>();
                foreach (Renderer r in renderers)
                {
                    foreach (Material m in r.materials)
                    {
                        if (m.HasProperty("_BaseColor"))
                        {
                            m.SetColor("_BaseColor", newColor);
                        }
                        else if (m.HasProperty("_Color"))
                        {
                            m.color = newColor;
                        }
                    }
                }
            }
        }

        private Transform ResolveAnchor(string category)
        {
            switch (category.ToLowerInvariant())
            {
                case "glasses":
                case "sunglasses":
                    return faceAnchor != null ? faceAnchor : transform;
                case "headwear":
                case "cap":
                case "hat":
                    return headAnchor != null ? headAnchor : transform;
                case "wrist":
                case "watch":
                case "bracelet":
                    return wristAnchor != null ? wristAnchor : transform;
                case "top":
                case "bottom":
                case "neck":
                default:
                    return avatarTorsoAnchor != null ? avatarTorsoAnchor : transform;
            }
        }
    }
}
