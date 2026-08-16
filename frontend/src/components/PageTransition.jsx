import { motion } from 'motion/react'

const pageVariants = {
  enter: { opacity: 0, x: 40, scale: 0.995 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -40, scale: 0.995 },
}

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}