using UnityEngine;
namespace AshenOath
{
    public static class CanvasTransform
    {
        public static void Rotate(float degrees,Vector2 localPivot)
        {GUI.matrix=GUI.matrix*Matrix4x4.TRS(localPivot,Quaternion.Euler(0,0,degrees),Vector3.one)*Matrix4x4.Translate(-localPivot);}
        public static void Scale(Vector2 value,Vector2 localPivot)
        {GUI.matrix=GUI.matrix*Matrix4x4.TRS(localPivot,Quaternion.identity,new Vector3(value.x,value.y,1))*Matrix4x4.Translate(-localPivot);}
    }
}
