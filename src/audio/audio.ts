import type { WorldState } from '../domain/types';
type Sound='ui'|'act'|'decay'|'knife'|'victory'|'death';
export class GameAudio {
  private context:AudioContext|null=null;private nextBeat=0;private enabled=true;
  volume={master:.35,music:.25,ambience:.23,sfx:.65,ui:.5};
  reset(){this.nextBeat=0;}
  unlock(){if(!this.context)this.context=new AudioContext();void this.context.resume();}
  setEnabled(value:boolean){this.enabled=value;if(!value)void this.context?.suspend();else void this.context?.resume();}
  private tone(hz:number,duration:number,type:OscillatorType,gain:number,delay=0){
    if(!this.context||!this.enabled||gain*this.volume.master<=0)return;
    const c=this.context,o=c.createOscillator(),g=c.createGain(),at=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(hz,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain*this.volume.master),at+.02);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.connect(g).connect(c.destination);o.start(at);o.stop(at+duration+.01);
  }
  play(sound:Sound){this.unlock();const v=this.volume.sfx;
    if(sound==='ui')this.tone(550,.12,'triangle',this.volume.ui*.32);
    if(sound==='act'){this.tone(196,.6,'sawtooth',v*.15);this.tone(294,.65,'triangle',v*.18,.09);}
    if(sound==='decay'){this.tone(330,.8,'triangle',v*.18);this.tone(165,1.1,'sine',v*.2,.1);}
    if(sound==='knife'){this.tone(760,.18,'sawtooth',v*.24);this.tone(430,.3,'triangle',v*.2,.12);}
    if(sound==='victory'){for(let i=0;i<4;i++)this.tone([220,277,330,440][i],.8,'triangle',v*.2,i*.2);}
    if(sound==='death'){this.tone(180,1.1,'sawtooth',v*.22);this.tone(96,1.3,'sine',v*.2,.1);}
  }
  update(s:WorldState){if(!this.context||!this.enabled||s.gameTimeMs<this.nextBeat||s.mode==='dead'||s.mode==='won')return;
    this.nextBeat=s.gameTimeMs+1800;
    const notes=[196,220,246,220],index=Math.floor(s.gameTimeMs/1800)%4;
    if(s.decayStage<3)this.tone(notes[index],1.3,'sine',this.volume.music*.13);
    if(s.decayStage<2&&index%2===0)this.tone(notes[index]*1.5,.7,'triangle',this.volume.ambience*.08,.15);
    if(index===3)this.tone(74,.45,'sine',this.volume.ambience*.12);
  }
}
