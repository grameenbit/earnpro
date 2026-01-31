import React, { useRef, useState, useEffect } from 'react';

interface SpinWheelProps {
  onSpin: () => void;
  isSpinning: boolean;
  onClose: () => void;
  spinValues: number[];
  targetIndex: number | null; 
}

const SpinWheel: React.FC<SpinWheelProps> = ({ onSpin, isSpinning, onClose, spinValues, targetIndex }) => {
  const [rotation, setRotation] = useState(0);
  
  // Vibrant colors for the wheel segments
  const segmentColors = [
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1'  // Indigo
  ];

  useEffect(() => {
    if (isSpinning && targetIndex !== null) {
      const segmentAngle = 360 / spinValues.length;
      
      // Calculate where the target center is currently relative to 0 (top/start)
      // Assuming initial render puts index 0 at standard position (usually 3 o'clock in CSS or adjusted via transform)
      // Let's assume standard CSS: 0deg is top.
      // Index i starts at i * angle. Center is i*angle + angle/2.
      
      const targetSegmentCenter = (targetIndex * segmentAngle) + (segmentAngle / 2);
      
      // We want this 'targetSegmentCenter' to end up at 0deg (TOP).
      // If we are at 'currentRotation', the next spin must land there.
      // Rotate BACKWARDS to bring target to 0? Or Forwards?
      // Standard Wheel of Fortune spins Clockwise (Increasing degrees).
      // If we increase degrees, the wheel items move Clockwise. The pointer (at top) effectively moves Counter-Clockwise relative to numbers.
      
      // Let's visualize: 
      // Arrow is at TOP (0 deg).
      // Segment 0 is at 0-60 deg. Center 30.
      // To get Segment 0 to Arrow, we rotate -30 deg (or 330 deg).
      
      // Formula: 
      // Full spins (to add excitement)
      const extraSpins = 360 * 5; 
      
      // Calculate alignment rotation.
      // We want (CurrentRotation + Delta) % 360 = (360 - TargetCenter).
      // Simpler: Just calculate absolute target.
      
      const alignmentRotation = 360 - targetSegmentCenter;
      
      // Add randomness within the segment so it doesn't always land dead center (optional, keeps it realistic)
      const fuzz = (Math.random() * (segmentAngle - 4)) - (segmentAngle / 2 - 2); 
      // Note: Fuzz might be risky if close to edge, keeping it dead center for safety.
      
      const newRotation = rotation + extraSpins + alignmentRotation;
      
      setRotation(newRotation);
    }
  }, [isSpinning, targetIndex, spinValues.length]);

  // Generate Conic Gradient String
  const generateConicGradient = () => {
    let gradient = 'conic-gradient(';
    const step = 100 / spinValues.length;
    
    spinValues.forEach((_, i) => {
      const color = segmentColors[i % segmentColors.length];
      const start = i * step;
      const end = (i + 1) * step;
      gradient += `${color} ${start}% ${end}%, `;
    });
    
    return gradient.slice(0, -2) + ')'; // Remove last comma and close
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm text-center relative rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        
        {/* Close Button */}
        <button onClick={onClose} disabled={isSpinning} className="absolute top-4 right-4 text-gray-400 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition z-50">
          <i className="fas fa-times"></i>
        </button>
        
        {/* Header */}
        <h3 className="text-3xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 uppercase tracking-wider drop-shadow-sm">Lucky Spin</h3>
        <p className="text-xs text-gray-500 mb-6 font-medium">Spin the wheel & win real points!</p>
        
        {/* Wheel Wrapper */}
        <div className="relative w-[280px] h-[280px] mx-auto mb-8">
            
            {/* Outer Glow/Ring */}
            <div className="absolute inset-[-12px] rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_0_30px_rgba(250,204,21,0.4)] z-0"></div>
            <div className="absolute inset-[-4px] rounded-full bg-gray-900 z-0"></div>

            {/* The Pointer (Arrow) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-lg">
                <div className="w-8 h-10 bg-red-600 [clip-path:polygon(50%_100%,_0%_0%,_100%_0%)]"></div>
            </div>

            {/* Rotating Wheel */}
            <div 
                className="absolute inset-0 rounded-full z-10 overflow-hidden"
                style={{ 
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0, 0.15, 1)' : 'none',
                    background: generateConicGradient(),
                    border: '4px solid white'
                }}
            >
                {/* Numbers */}
                {spinValues.map((val, i) => {
                    const angle = 360 / spinValues.length;
                    // Rotate to center of segment, then translate outwards
                    const rotationAngle = (i * angle) + (angle / 2);
                    
                    return (
                        <div 
                            key={i} 
                            className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
                            style={{ transform: `rotate(${rotationAngle}deg)` }}
                        >
                            <span 
                                className="text-white font-black text-xl select-none"
                                style={{ 
                                    transform: `translateY(-85px)`, // Push text towards edge
                                    textShadow: '2px 2px 0px rgba(0,0,0,0.3), -1px -1px 0 rgba(0,0,0,0.3)'
                                }}
                            >
                                {val}
                            </span>
                        </div>
                    );
                })}

                {/* Segment Dividers (Optional lines for clarity) */}
                {spinValues.map((_, i) => (
                    <div 
                        key={i}
                        className="absolute top-0 left-1/2 w-[2px] h-1/2 bg-white/30 origin-bottom -translate-x-1/2"
                        style={{ transform: `rotate(${i * (360 / spinValues.length)}deg)` }}
                    ></div>
                ))}
            </div>

            {/* Center Cap */}
            <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white dark:bg-gray-800 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 border-yellow-500">
                <div className="text-yellow-500 font-black text-xs uppercase tracking-tighter leading-tight text-center">
                    WIN<br/>BIG
                </div>
            </div>
        </div>

        {/* Spin Button */}
        <button 
            onClick={onSpin} 
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg shadow-red-500/30 transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        >
            {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
        </button>
      </div>
    </div>
  );
};

export default SpinWheel;