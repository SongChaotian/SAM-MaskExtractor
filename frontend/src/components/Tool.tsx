// Copyright (c) Meta Platforms, Inc. and affiliates.
// All rights reserved.

// This source code is licensed under the license found in the
// LICENSE file in the root directory of this source tree.

import React, { useContext, useEffect, useState } from "react";
import AppContext from "./hooks/createContext";
import { ToolProps } from "./helpers/Interfaces";
import * as _ from "underscore";

const Tool = ({ handleMouseMove, handleClick  }: ToolProps) => {
  const {
    image: [image, setImage],
    maskImg: [maskImg, setMaskImg],
    canvasCache: [canvasCache, setCanvasCache],
    image_path: [image_path, setImagePath],
  } = useContext(AppContext)!;

  const [fileName, setFileName] = useState<string | null>(null);

  // 确定是缩小还是增大图片以匹配页面的宽度或高度
  // 并设置一个 ResizeObserver 来监控页面大小的变化。
  const [shouldFitToWidth, setShouldFitToWidth] = useState(true);
  const bodyEl = document.body;
  const fitToPage = () => {
    if (!image) return;
    const imageAspectRatio = image.width / image.height;
    const screenAspectRatio = window.innerWidth / window.innerHeight;
    setShouldFitToWidth(imageAspectRatio > screenAspectRatio);
  };
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === bodyEl) {
        fitToPage();
      }
    }
  });
  useEffect(() => {
    fitToPage();
    resizeObserver.observe(bodyEl);
    return () => {
      resizeObserver.unobserve(bodyEl);
    };
  }, [image]);

  const imageClasses = "";
  const maskImageClasses = `absolute opacity-40 pointer-events-none`;

  // 将canvasCache转换为图像并设置maskImg
  const canvasToImage = (canvas: HTMLCanvasElement) => {
    if (!canvas) {
      setMaskImg(null);
      return;
    }
    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => {
      setMaskImg(img);
    };
  }

  // 导出图像的方法
  const exportImage = () => {
    if (!image || !canvasCache) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置canvas的宽度和高度
    canvas.width = image.width;
    canvas.height = image.height;

    // 绘制原始图像
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // 绘制mask图像
    if (maskImg) {
      ctx.drawImage(maskImg, 0, 0, image.width, image.height);
    }

    // 将canvas转换为图像并触发下载
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");

    const export_name = fileName!.split('.')[0];
    link.download = `${export_name}.png`;
    link.click();
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    
    if (file) {
      setImagePath("model/imgs/" + file.name);
      setFileName(file.name);
    }
  };

  // 渲染图像和上面的预测mask图像
  return (
    <>
      {image && (
        <img
          onMouseMove={handleMouseMove}
          onClick={handleClick} // 添加点击事件处理程序
          onMouseOut={() => _.defer(() => canvasToImage(canvasCache!))}
          onTouchStart={handleMouseMove}
          src={image.src}
          className={`${
            shouldFitToWidth ? "w-full" : "h-full"
          } ${imageClasses}`}
        ></img>
      )}
      {maskImg && (
        <img
          src={maskImg.src}
          className={`${
            shouldFitToWidth ? "w-full" : "h-full"
          } ${maskImageClasses}`}
        ></img>
      )}
      <div>
        <button
              onClick={exportImage}
              className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-6 py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
              Export Image
        </button>
        <label
            htmlFor="file-upload"
            className="absolute top-18 right-4 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-6 py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer text-center"
          >
            Import Image
        </label>
        <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
    </>
  );
};

export default Tool;
