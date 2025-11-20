    ];

return (
    <>
        {/* 배경 클릭 시 메뉴 닫기 */}
        <div
            className="fixed inset-0 z-50"
            onClick={onClose}
            onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        />

        {/* 메뉴 본문 */}
        <div
            className="fixed z-50 bg-white/90 backdrop-blur-sm shadow-lg rounded-lg p-2 min-w-[150px] border border-gray-200"
            style={{ top: y, left: x }}
        >
            <div className="text-xs text-gray-500 mb-2 px-2">Colors</div>
            <div className="flex gap-2 px-2 mb-3">
                {colors.map((color) => (
                    <button
                        key={color}
                        className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                            onColorChange(color);
                            onClose();
                        }}
                        aria-label={`Change color to ${color}`}
                    />
                ))}
            </div>

            <div className="h-px bg-gray-200 my-1" />

            <button
                className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center justify-between"
                onClick={() => {
                    onAlwaysOnTopToggle();
                    onClose();
                }}
            >
                <span>Always on Top</span>
                {isAlwaysOnTop && <span className="text-blue-500">✓</span>}
            </button>
        </div>
    </>
);
};
