/**
 * Format: [filter_name, filter_value, filter_description]
 */

export const filters = [
  ["3D", "apulsator=hz=0.125", "3D surround sound"],
  ["Flanger", "flanger=delay=20:depth=10", "The 'flanger' effect of 90's"],
  ["Haas Left", "extrastereo=m=0:haas=middle_source=left", "Make the 'left' sound echo more"],
  ["Haas Middle", "extrastereo=m=0:haas=middle_source=mid", "Make the 'middle' sound echo more"],
  ["Haas Right", "extrastereo=m=0:haas=middle_source=right", "Make the 'right' sound echo more"],
  ["Pan Left", "stereotools=mpan=-0.75", "Make it sound from the left"],
  ["Pan Middle", "stereotools=mpan=0", "Make it sound from the center (normal)"],
  ["Pan Right", "stereotools=mpan=0.75", "Make it sound from the right"],
  ["Phonk", "acompressor=level_in=4:mode=upward", "To those who love 'Phonk'"],
  ["Concert", "acompressor=level_in=8", "Sounds like I'm at a concert"],
  ["Low Bass", "bass=g=-20", "Significantly reduce the bass (for mobile users)"],
  ["Light Bass", "bass=g=4", "4x the original bass"],
  ["Heavy Bass", "bass=g=8", "8x the original bass"],
  ["Max Bass", "bass=g=20", "20x the original bass"],
  ["Smooth", "adynamicsmooth", "Apply some smoothness to the audio"],
  ["44.1kHz", "aresample=44100", "Set sampling rate to 44100Hz (standard)"],
  ["Echo", "aecho=0.8:0.9:1000:0.3", "Double the sound, but with a delay"],
  ["Copycat", "aecho", "Double the sound, with a higher delay, like a copycat"],
  ["8D", "apulsator=hz=0.08", "8D surround sound"],
  ["Subboost", "asubboost=boost=12", "Boosts tiny details or low vocals in the sound"],
  ["Flat", "asuperpass=level=2", "Flats out every tone in the audio"],
  [
    "Vaporwave",
    "aresample=48000,asetrate=48000*0.8",
    "Slow it down, reverb it, That's slowed + reverb"
  ],
  ["Nightcore", "aresample=48000,asetrate=48000*1.2", "Speed it up, clip it, That's nightcore"],
  ["Sharp", "treble=g=10", "Make louder tones in audio even sharper"],
  ["Chorus", "chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.39"],
  ["Stereo", "extrastereo"],
  ["Stereo Swap", "extrastereo=m=-1", "Swaps left and right earpiece sounds"],
  ["Vocals (1)", "speechnorm=e=12.5:r=0.0001:l=1", "Basic vocal boost"],
  ["Vocals (2)", "speechnorm=e=25:r=0.0001:l=1", "Strong vocal boost"],
  ["Vocals (3)", "speechnorm=e=50:r=0.0001:l=1", "Extreme vocal boost"],
  ["Shiver", "tremolo=f=8", "Make the audio shiver like fear"],
  ["Funny", "vibrato=f=8"],
  ["Crying", "vibrato=f=8:d=1"]
];
