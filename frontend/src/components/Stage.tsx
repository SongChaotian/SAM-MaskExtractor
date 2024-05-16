// Copyright (c) Meta Platforms, Inc. and affiliates.
// All rights reserved.

// This source code is licensed under the license found in the
// LICENSE file in the root directory of this source tree.

import React, { useContext, useEffect, useState } from "react";
import * as _ from "underscore";
import Tool from "./Tool";
import { modelInputProps } from "./helpers/Interfaces";
import AppContext from "./hooks/createContext";

const Stage = () => {
  const {
    clicks: [clicks, setClicks],
    image: [image],
  } = useContext(AppContext)!;

  const getClick = (x: number, y: number, clickType: number): modelInputProps => {
    // clickType: 0 for click, 1 for move
    return { x, y, clickType };
  };

  // 获取鼠标位置并将 (x, y) 坐标缩放回图像的自然比例。
  // 使用 setClicks 更新点击状态，以触发 ONNX 模型运行，并通过 App.tsx 中的 useEffect 生成新的mask
  // _.throttle 是 underscore 库中的一个函数，用于限制函数的调用频率。它确保函数在指定的时间间隔内最多执行一次
  const handleMouseMove = _.throttle((e: any) => {
    let el = e.nativeEvent.target;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    const imageScale = image ? image.width / el.offsetWidth : 1;
    x *= imageScale;
    y *= imageScale;
    const click = getClick(x, y, 1);
    
    if (click) setClicks([click]);
  }, 15);  // 确保它在 15 毫秒内最多执行一次

   // 处理鼠标点击事件
  const handleClick = (e: any) => {
    let el = e.nativeEvent.target;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    const imageScale = image ? image.width / el.offsetWidth : 1;
    x *= imageScale;
    y *= imageScale;
    const click = getClick(x, y, 0);

    if (click) setClicks([click]);
  };

  const flexCenterClasses = "flex items-center justify-center";
  return (
    <div className={`${flexCenterClasses} w-full h-full`}>
      <div className={`${flexCenterClasses} relative w-[90%] h-[90%]`}>
        <Tool handleMouseMove={handleMouseMove} handleClick={handleClick} />
      </div>
    </div>
  );
};

export default Stage;
