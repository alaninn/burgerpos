function Toggle({ activo, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!activo)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${activo ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          activo ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default Toggle;
