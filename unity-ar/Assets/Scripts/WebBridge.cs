using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace Zyntra.AR
{
    /// <summary>
    /// Inter-process communication bridge between React/Vite web application and Unity WebGL.
    /// Handles external JavaScript calls to equip items, update colors, and inspect tracking telemetry.
    /// </summary>
    public class WebBridge : MonoBehaviour
    {
        public static WebBridge Instance { get; private set; }

        // Native JS callback declaration for WebGL builds
        [DllImport("__Internal")]
        private static extern void OnZyntraItemEquipped(string itemId, string category);

        [DllImport("__Internal")]
        private static extern void OnZyntraTrackingTelemetry(string telemetryJson);

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        #region Inbound API (Called from React via SendMessage)

        /// <summary>
        /// Equip an item by its ID. Called from React:
        /// sendMessage("ZyntraWebBridge", "EquipItem", "sunglasses");
        /// </summary>
        public void EquipItem(string itemId)
        {
            Debug.Log($"[WebBridge] EquipItem called from Web Client: '{itemId}'");
            if (AccessoryManager.Instance != null)
            {
                AccessoryManager.Instance.EquipAccessory(itemId);
            }
        }

        /// <summary>
        /// Unequip a category. Called from React:
        /// sendMessage("ZyntraWebBridge", "UnequipCategory", "glasses");
        /// </summary>
        public void UnequipCategory(string category)
        {
            Debug.Log($"[WebBridge] UnequipCategory called: '{category}'");
            if (AccessoryManager.Instance != null)
            {
                AccessoryManager.Instance.UnequipCategory(category);
            }
        }

        /// <summary>
        /// Adjust scale multiplier. Called from React:
        /// sendMessage("ZyntraWebBridge", "SetScale", "glasses:1.15");
        /// </summary>
        public void SetScale(string categoryAndScale)
        {
            string[] parts = categoryAndScale.Split(':');
            if (parts.Length == 2 && float.TryParse(parts[1], out float scale))
            {
                AccessoryManager.Instance?.SetCategoryScale(parts[0], scale);
            }
        }

        /// <summary>
        /// Set garment / accessory color hex. Called from React:
        /// sendMessage("ZyntraWebBridge", "SetColor", "top:#00f0ff");
        /// </summary>
        public void SetColor(string categoryAndHex)
        {
            string[] parts = categoryAndHex.Split(':');
            if (parts.Length == 2)
            {
                if (ColorUtility.TryParseHtmlString(parts[1], out Color parsedColor))
                {
                    AccessoryManager.Instance?.SetGarmentColor(parts[0], parsedColor);
                }
            }
        }

        #endregion

        #region Outbound API (Dispatches events to React)

        public void NotifyItemEquipped(string itemId, string category)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try
            {
                OnZyntraItemEquipped(itemId, category);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[WebBridge] Could not dispatch to browser JS: {ex.Message}");
            }
#else
            Debug.Log($"[WebBridge Event -> Browser] ItemEquipped: {itemId} ({category})");
#endif
        }

        public void BroadcastTelemetry(float fps, int vertices, string status)
        {
            string json = $"{{\"fps\":{fps:F1},\"vertices\":{vertices},\"status\":\"{status}\"}}";
#if UNITY_WEBGL && !UNITY_EDITOR
            try
            {
                OnZyntraTrackingTelemetry(json);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[WebBridge] Could not dispatch telemetry: {ex.Message}");
            }
#else
            Debug.Log($"[WebBridge Telemetry]: {json}");
#endif
        }

        #endregion
    }
}
