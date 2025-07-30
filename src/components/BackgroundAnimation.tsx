
'use client';

import React from 'react';
import styles from './BackgroundAnimation.module.css';

const BackgroundAnimation: React.FC = () => {
  return (
    <>
      <div className={styles.area}></div>
      <div className={styles.background}>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </>
  );
};

export default BackgroundAnimation;
