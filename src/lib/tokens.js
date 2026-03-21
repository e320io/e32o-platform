export const C = {
  bg:'#0A0A0A',card:'#141414',cardH:'#1A1A1A',brd:'#1F1F1F',brdH:'#2A2A2A',
  acc:'#B8F03E',accDim:'rgba(184,240,62,0.12)',accTxt:'#0A0A0A',
  amb:'#EF9F27',ambDim:'rgba(239,159,39,0.12)',
  cor:'#E85D30',corDim:'rgba(232,93,48,0.12)',
  teal:'#1D9E75',tealDim:'rgba(29,158,117,0.12)',
  purp:'#7F77DD',purpDim:'rgba(127,119,221,0.12)',
  blue:'#378ADD',blueDim:'rgba(55,138,221,0.12)',
  txt:'#E8E8E8',txtS:'#888888',txtM:'#555555',wh:'#FFFFFF',
  red:'#E24B4A',redDim:'rgba(226,75,74,0.12)',
  pepe:'#EF9F27',
};

export const FLOW_FULL = [
  {k:'pendiente',l:'Pendiente',c:C.txtM,ot:null},
  {k:'research',l:'Research',c:C.purp,ot:'url',ol:'URL referencia',hc:true},
  {k:'guion',l:'Guión',c:C.blue,ot:'text',ol:'Guión en bullets'},
  {k:'aprobacion',l:'Aprobación',c:C.amb,ot:'text',ol:'Notas'},
  {k:'grabacion',l:'Grabación',c:C.cor,ot:'file',ol:'Proyecto'},
  {k:'edicion',l:'Edición',c:C.purp,ot:'file',ol:'Editado'},
  {k:'revision_cliente',l:'Rev. cliente',c:C.amb,ot:'text',ol:'Feedback'},
  {k:'publicado',l:'Publicado',c:C.teal,ot:'text',ol:'Link'},
];

export const FLOW_SHORT = [
  {k:'pendiente',l:'Pendiente',c:C.txtM,ot:null},
  {k:'grabacion',l:'Material',c:C.cor,ot:'file',ol:'Archivo'},
  {k:'edicion',l:'Edición',c:C.purp,ot:'file',ol:'Editado'},
  {k:'publicado',l:'Publicado',c:C.teal,ot:'text',ol:'Link'},
];

export const STAGES_FULL = ['research','guion','aprobacion','grabacion','edicion','revision_cliente','publicado'];
export const STAGES_SHORT = ['grabacion','edicion','publicado'];
export const PIECE_LABELS = {reel:'Reel',fast_reel:'Fast Reel',carrusel:'Carrusel',video:'Video',imagen:'Imagen',gestion_ads:'Gestión Ads',episodio_youtube:'Ep. YouTube',reel_episodio:'Reel ep.',reel_individual:'Reel indiv.',reel_grabacion:'Reel grab.',reel_predica:'Reel préd.',clip_predica:'Clip préd.'};
export const PIECE_COLORS = {reel:C.blue,fast_reel:C.cor,carrusel:C.purp,video:C.blue,imagen:'#D4537E',gestion_ads:C.amb,episodio_youtube:'#E24B4A',reel_episodio:C.teal,reel_individual:C.blue,reel_grabacion:C.teal,reel_predica:C.cor,clip_predica:C.amb};
export const ROLE_COLORS = {founder:C.acc,cofounder:'#D4537E',asistente:C.blue,editor:C.purp,filmaker:C.amb};
export const ROLE_LABELS = {founder:'Founder',cofounder:'Co-founder',asistente:'Asistente',editor:'Editor',filmaker:'Filmaker'};
export const STAGE_LABELS = {research:'Research',guion:'Guión',aprobacion:'Aprobación',grabacion:'Grabación',edicion:'Edición',revision_cliente:'Rev. cliente',publicado:'Publicación',pendiente:'Pendiente'};
export const TODAY = new Date().toISOString().split('T')[0];
export const CURRENT_PERIOD = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
