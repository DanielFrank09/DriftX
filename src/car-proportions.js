// Sparse design stations: width, deck, fender rise, and cabin shape, in metres.
// These define the silhouette; fine trim stays in car-models.js.
export const PROPORTIONS={
 m4:{height:1.397,radius:.35,tireWidth:.27,rimRatio:.77,axleOffset:-.10,roundness:.12,haunch:.065,waist:.96,roof:[-.78,-.17,.40,.91,1.66],roofWidth:.335,rearGlass:.50,wingHeight:.50},
 r8:{height:1.24,radius:.345,tireWidth:.29,rimRatio:.77,axleOffset:-.03,roundness:.16,haunch:.10,waist:.93,roof:[-1.12,-.52,-.10,.39,.98],roofWidth:.325,rearGlass:.43,wingHeight:.55},
 huracan:{height:1.165,radius:.345,tireWidth:.29,rimRatio:.78,axleOffset:-.06,roundness:.10,haunch:.13,waist:.91,roof:[-1.30,-.42,-.04,.43,1.15],roofWidth:.315,rearGlass:.39,wingHeight:.49},
 r32:{height:1.34,radius:.325,tireWidth:.245,rimRatio:.70,axleOffset:-.06,roundness:.05,haunch:.055,waist:.975,roof:[-.69,-.20,.27,.78,1.39],roofWidth:.355,rearGlass:.34,wingHeight:.61},
 r35:{height:1.37,radius:.355,tireWidth:.29,rimRatio:.78,axleOffset:-.05,roundness:.12,haunch:.13,waist:.91,roof:[-.94,-.34,.18,.66,1.52],roofWidth:.33,rearGlass:.38,wingHeight:.58},
 gt3rs:{height:1.322,radius:.35,tireWidth:.30,rimRatio:.77,axleOffset:-.04,roundness:.25,haunch:.19,waist:.895,roof:[-1.04,-.52,-.03,.53,1.56],roofWidth:.33,rearGlass:.48,wingHeight:.67},
 supra:{height:1.275,radius:.33,tireWidth:.265,rimRatio:.72,axleOffset:-.10,roundness:.22,haunch:.11,waist:.925,roof:[-.53,-.04,.40,.83,1.63],roofWidth:.34,rearGlass:.46,wingHeight:.73},
 rx7:{height:1.23,radius:.325,tireWidth:.255,rimRatio:.74,axleOffset:-.09,roundness:.25,haunch:.13,waist:.91,roof:[-.64,-.12,.29,.69,1.45],roofWidth:.335,rearGlass:.48,wingHeight:.70},
 c8:{height:1.234,radius:.35,tireWidth:.29,rimRatio:.78,axleOffset:-.08,roundness:.13,haunch:.14,waist:.90,roof:[-1.22,-.56,-.16,.27,.96],roofWidth:.315,rearGlass:.40,wingHeight:.62},
 mustang:{height:1.381,radius:.35,tireWidth:.275,rimRatio:.75,axleOffset:-.05,roundness:.13,haunch:.11,waist:.94,roof:[-.66,-.02,.36,.73,1.84],roofWidth:.34,rearGlass:.50,wingHeight:.58},
 f40:{height:1.124,radius:.325,tireWidth:.285,rimRatio:.72,axleOffset:-.09,roundness:.08,haunch:.085,waist:.93,roof:[-1.10,-.43,-.05,.32,.96],roofWidth:.325,rearGlass:.40,wingHeight:.625},
 mx5:{height:1.235,radius:.295,tireWidth:.205,rimRatio:.64,axleOffset:-.04,roundness:.22,haunch:.10,waist:.94,roof:[-.44,-.10,.20,.72,1.09],roofWidth:.33,rearGlass:.40,wingHeight:.43},
};
const drops={m4:[.12,.16,.12],r8:[.11,.14,.12],huracan:[.08,.13,.13],r32:[.13,.15,.14],r35:[.12,.17,.15],gt3rs:[.12,.16,.14],supra:[.10,.15,.15],rx7:[.09,.14,.12],c8:[.10,.15,.14],mustang:[.14,.18,.16],f40:[.07,.12,.13],mx5:[.09,.12,.10]};
for(const [id,values]of Object.entries(drops))[PROPORTIONS[id].frontDrop,PROPORTIONS[id].deckDrop,PROPORTIONS[id].tailDrop]=values;
