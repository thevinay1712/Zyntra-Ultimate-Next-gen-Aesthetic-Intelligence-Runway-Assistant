using UnityEngine;
using UnityEngine.SceneManagement;

namespace Zyntra.AR
{
    /// <summary>
    /// Handles seamless transitions between Mobile AR Camera mode and 3D Turntable mode.
    /// </summary>
    public class SceneSwitcher : MonoBehaviour
    {
        public const string SCENE_MOBILE_AR = "LiveAR_TryOn";
        public const string SCENE_WEB_3D = "Web3D_TryOn";

        public void LoadMobileARScene()
        {
            Debug.Log("[SceneSwitcher] Loading Mobile AR Foundation Scene...");
            SceneManager.LoadScene(SCENE_MOBILE_AR);
        }

        public void LoadWeb3DScene()
        {
            Debug.Log("[SceneSwitcher] Loading Web 3D Turntable Scene...");
            SceneManager.LoadScene(SCENE_WEB_3D);
        }
    }
}
