export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-6 py-3 rounded-full font-medium transition-all duration-300 shadow-sm hover:scale-105 hover:shadow-hover active:scale-95 flex items-center justify-center";
  const variants = {
    primary: "bg-primary text-white",
    secondary: "bg-white text-text border border-gray-200",
    dark: "bg-text text-white",
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
