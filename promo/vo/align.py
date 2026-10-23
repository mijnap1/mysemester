import json, sys, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(np.frombuffer(subprocess.run(["ffmpeg","-v","quiet","-i","vo/voiceover.mp3","-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout,np.float32), word_timestamps=True, beam_size=5,
    initial_prompt="Every course. Every mark. One number that matters. Drop in your syllabus, and the weights fill themselves in. Add a mark, your average moves, your GPA keeps up... on your school's own scale. Semester after semester, it all adds up. Every grade, one calm semester. MySemester.")
words = [dict(w=w.word.strip(), s=round(w.start, 3), e=round(w.end, 3)) for s in segs for w in s.words]
json.dump(words, open("vo/words.json", "w"), indent=1)
for w in words: print(f"{w['s']:6.2f} {w['e']:6.2f}  {w['w']}")
