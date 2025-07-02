
'use client';

import React from 'react';
import styles from './BackgroundAnimation.module.css';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const BackgroundAnimation: React.FC = () => {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth/');

  return (
    <>
      <div className={styles.area}>
        <ul className={styles.circles}>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
      </div>
      {isAuthPage && (
        <div className="fixed bottom-0 left-0 w-full -z-10 pointer-events-none">
          {/* The skyline image has been removed as it was causing a 404 error. */}
        </div>
      )}
    </>
  );
};

export default BackgroundAnimation;
