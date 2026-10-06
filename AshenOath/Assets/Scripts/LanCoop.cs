using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using UnityEngine;

namespace AshenOath
{
    // LAN test transport: host owns simulation; clients send bounded input only.
    // No relay, account, cloud service, host migration, or persistent co-op rewards.
    public sealed class LanCoop:MonoBehaviour
    {
        [Serializable] public sealed class Packet
        {
            public int protocol=1,kind,id,seq,ack,job,room,region,order,potions;public string token,nonce,message;
            public Controls input;public bool town,cleared,dead,eventResolved;public string eventName;
            public Fighter[] actors;public Missile[] shots;public Platform[] platforms;public RoomKind[] route;public Profile profile;
        }
        sealed class Peer{public IPEndPoint endpoint;public string token,nonce;public int id,job,seq=-1;public float seen;}
        readonly Dictionary<string,Peer> peers=new Dictionary<string,Peer>();
        UdpClient socket;IPEndPoint server;Profile original;string nonce,token;int sequence,pendingSeq;
        Controls controls;float nextSend,lastReceive,opened;int port;
        public int mode,localId;public string status="오프라인",address="127.0.0.1";
        public void Host(int number=7777)
        {
            if(mode!=0)return;
            try{original=JsonUtility.FromJson<Profile>(JsonUtility.ToJson(GameSession.I.profile));socket=new UdpClient(new IPEndPoint(IPAddress.Any,number));socket.Client.Blocking=false;mode=1;port=number;localId=0;status="LAN 방장 · 포트 "+number;}
            catch(Exception e){socket?.Close();socket=null;status="방 생성 실패: "+e.Message;GameSession.I.Toast(status);}
        }
        public void Join(string ip,int number=7777)
        {
            if(mode!=0)return;
            if(!IPAddress.TryParse(ip,out var parsed)||parsed.AddressFamily!=AddressFamily.InterNetwork){status="IPv4 주소를 입력하세요.";return;}
            try{original=JsonUtility.FromJson<Profile>(JsonUtility.ToJson(GameSession.I.profile));socket=new UdpClient(0);socket.Client.Blocking=false;server=new IPEndPoint(parsed,number);mode=2;port=number;localId=-1;nonce=Guid.NewGuid().ToString("N");token=null;opened=lastReceive=Time.realtimeSinceStartup;status="방장에 연결 중…";}
            catch(Exception e){socket?.Close();socket=null;mode=0;status="접속 실패: "+e.Message;}
        }
        public void Stop()
        {
            socket?.Close();socket=null;mode=0;localId=0;peers.Clear();status="오프라인";
            if(original!=null){GameSession.I.profile=original;original=null;GameSession.I.GoTown(false);}
        }
        void OnDestroy(){socket?.Close();}
        public void SendControls(Controls value)
        {
            controls.move=Mathf.Clamp(value.move,-1,1);controls.block=value.block;
            if(value.attack||value.skill||value.jump||value.dodge){controls.attack|=value.attack;controls.skill|=value.skill;controls.jump|=value.jump;controls.dodge|=value.dodge;pendingSeq=++sequence;}
            GameSession.I.localInput.attack=GameSession.I.localInput.jump=GameSession.I.localInput.skill=GameSession.I.localInput.dodge=false;
        }
        void Update()
        {
            if(socket==null||mode==0)return;float now=Time.realtimeSinceStartup;
            for(int n=0;n<40&&socket.Available>0;n++)
            {
                try{var endpoint=new IPEndPoint(IPAddress.Any,0);byte[] data=socket.Receive(ref endpoint);if(data.Length>60000)continue;
                    var p=JsonUtility.FromJson<Packet>(Encoding.UTF8.GetString(data));if(p==null||p.protocol!=1)continue;
                    if(mode==1)ReceiveHost(p,endpoint,now);else if(endpoint.Equals(server))ReceiveClient(p,now);
                }catch(SocketException){break;}catch(Exception e){Debug.LogWarning("LAN invalid packet: "+e.GetType().Name);}
            }
            if(mode==1)
            {
                foreach(var key in peers.Where(k=>now-k.Value.seen>8).Select(k=>k.Key).ToArray())
                {var id=peers[key].id;var f=GameSession.I.actors.Find(a=>a.id==id);if(f!=null){f.remote=false;f.input=default;f.name=id==1?"세라핀":"리안나";}peers.Remove(key);}
                if(now>=nextSend){nextSend=now+1/15f;foreach(var p in peers.Values)SendSnapshot(p);}
                status="LAN 방장 · "+(1+peers.Count)+" / 3명 · 포트 "+port;
            }
            else
            {
                if(now-lastReceive>10){Stop();GameSession.I.Toast("방장 응답이 없어 연결을 종료했습니다. 개인 저장은 유지됩니다.");return;}
                if(now>=nextSend){nextSend=now+(token==null?.5f:1/30f);
                    Send(new Packet{kind=token==null?0:2,nonce=nonce,token=token,seq=pendingSeq,input=controls,job=original.job},server);}
            }
        }
        void ReceiveHost(Packet p,IPEndPoint endpoint,float now)
        {
            string key=endpoint.ToString();
            if(p.kind==0)
            {
                if(string.IsNullOrEmpty(p.nonce)||p.nonce.Length>64)return;
                if(!peers.TryGetValue(key,out var peer))
                {
                    if(peers.Count>=2){Send(new Packet{kind=4,message="파티 정원이 찼습니다.",nonce=p.nonce},endpoint);return;}
                    peer=new Peer{endpoint=endpoint,nonce=p.nonce,job=Mathf.Clamp(p.job,0,5),token=Guid.NewGuid().ToString("N"),id=peers.Values.Any(x=>x.id==1)?2:1};peers.Add(key,peer);
                    var actor=GameSession.I.actors.Find(a=>a.id==peer.id);if(actor!=null){actor.job=Mathf.Clamp(p.job,0,5);actor.Refresh(GameSession.I.profile.level);actor.art="hero";actor.remote=true;actor.name="여행자 "+(peer.id+1);}
                }
                if(peer.nonce!=p.nonce)return;peer.seen=now;
                Send(new Packet{kind=1,id=peer.id,token=peer.token,nonce=peer.nonce},endpoint);return;
            }
            if(p.kind!=2||!peers.TryGetValue(key,out var sender)||sender.token!=p.token)return;
            sender.seen=now;var f=GameSession.I.actors.Find(a=>a.id==sender.id);if(f==null)return;
            f.input.move=float.IsNaN(p.input.move)||float.IsInfinity(p.input.move)?0:Mathf.Clamp(p.input.move,-1,1);f.input.block=p.input.block;
            if(p.seq>sender.seq){sender.seq=p.seq;f.input.attack|=p.input.attack;f.input.skill|=p.input.skill;f.input.jump|=p.input.jump;f.input.dodge|=p.input.dodge;}
        }
        void ReceiveClient(Packet p,float now)
        {
            if(p.kind==4&&p.nonce==nonce){Stop();GameSession.I.Toast(p.message);return;}
            if(p.kind==1&&p.nonce==nonce){token=p.token;localId=p.id;lastReceive=now;status="LAN 참가 · 슬롯 "+(localId+1);return;}
            if(p.kind!=3||token==null||p.token!=token||p.actors==null||p.actors.Length>40)return;
            lastReceive=now;var g=GameSession.I;g.actors.Clear();g.actors.AddRange(p.actors);g.shots.Clear();if(p.shots!=null)g.shots.AddRange(p.shots);
            g.inTown=p.town;g.room=p.room;g.region=p.region;g.route=p.route;g.cleared=p.cleared;g.order=p.order;g.potions=p.potions;g.deathScreen=p.dead;g.eventResolved=p.eventResolved;g.eventName=p.eventName;
            if(p.profile!=null)g.profile=p.profile;
            g.platforms.Clear();if(p.platforms!=null)g.platforms.AddRange(p.platforms);
            g.worldWidth=g.inTown?24:42;
            if(g.Hero!=null)g.cameraX=Mathf.Clamp(g.Hero.x-8,0,g.worldWidth-24);
            if(p.ack>=pendingSeq){controls.attack=controls.skill=controls.jump=controls.dodge=false;}
        }
        void SendSnapshot(Peer peer)
        {
            var g=GameSession.I;
            Send(new Packet{kind=3,token=peer.token,ack=peer.seq,actors=g.actors.ToArray(),shots=g.shots.ToArray(),platforms=g.platforms.ToArray(),town=g.inTown,room=g.room,region=g.region,route=g.route,
                cleared=g.cleared,order=g.order,potions=g.potions,profile=g.profile,dead=g.deathScreen,eventResolved=g.eventResolved,eventName=g.eventName},peer.endpoint);
        }
        void Send(Packet packet,IPEndPoint endpoint)
        {try{byte[] data=Encoding.UTF8.GetBytes(JsonUtility.ToJson(packet));if(data.Length<60000)socket.Send(data,data.Length,endpoint);}catch(SocketException){}}
        public void ReapplyPeers()
        {foreach(var peer in peers.Values){var f=GameSession.I.actors.Find(a=>a.id==peer.id);if(f!=null){f.job=peer.job;f.Refresh(GameSession.I.profile.level);f.remote=true;f.art="hero";f.name="여행자 "+(peer.id+1);}}}
    }
}
