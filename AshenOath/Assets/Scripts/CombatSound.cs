using UnityEngine;

namespace AshenOath
{
    // Original procedural sound effects; no external audio or licensed recordings.
    public sealed class CombatSound:MonoBehaviour
    {
        AudioSource source;AudioClip hit,cast,heal;
        void Awake(){source=gameObject.AddComponent<AudioSource>();source.spatialBlend=0;source.volume=.22f;hit=Make(145,.09f,.65f);cast=Make(560,.18f,.1f);heal=Make(880,.3f,0);}
        static AudioClip Make(float pitch,float duration,float noise)
        {
            int count=(int)(22050*duration);float[] data=new float[count];var rng=new System.Random((int)pitch);
            for(int i=0;i<count;i++){float t=i/22050f,envelope=Mathf.Pow(1-i/(float)count,2);data[i]=(Mathf.Sin(2*Mathf.PI*pitch*t*(1-t*.8f))*(1-noise)+(float)(rng.NextDouble()*2-1)*noise)*envelope*.45f;}
            var clip=AudioClip.Create("AshenOath_"+pitch,count,1,22050,false);clip.SetData(data,0);return clip;
        }
        public void Play(int kind){if(source!=null)source.PlayOneShot(kind==2?heal:kind==1?cast:hit);}
    }
}
