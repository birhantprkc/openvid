export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020202]/50 backdrop-blur-3xl saturate-200 animate-fade-in">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-30 mix-blend-screen select-none">
        <div className="absolute -top-1/4 -left-1/4 size-[600px] rounded-full bg-gradient-to-br from-cyan-600/30 to-emerald-700/0 blur-[140px] animate-[spin_50s_linear_infinite]" />
        <div className="absolute -bottom-1/4 -right-1/4 size-[700px] rounded-full bg-gradient-to-tl from-indigo-700/25 to-purple-700/0 blur-[160px] animate-[spin_80s_linear_infinite_reverse]" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        <div className="absolute size-[1200px] rounded-full bg-radial from-cyan-700/10 via-indigo-700/3 to-transparent blur-[200px] mix-blend-plus-lighter transform-gpu" />
        
        <div className="absolute size-[800px] rounded-full bg-radial from-cyan-800/10 via-purple-800/4 to-transparent blur-[140px] mix-blend-plus-lighter transform-gpu" />
      </div>

      <div className="relative flex items-center justify-center z-10 scale-95 animate-[pulse_6s_ease-in-out_infinite]">
        
        <div className="absolute size-36 rounded-full bg-cyan-700/10 blur-2xl pointer-events-none" />

        <img 
          src="/svg/logo-openvid.svg" 
          alt="Cargando OpenVid..."
          className="relative size-30 object-contain select-none filter drop-shadow-[0_0_35px_rgba(6,182,212,0.4)]"
          draggable={false}
        />
      </div>
    </div>
  );
}
