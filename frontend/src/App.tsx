import React, { useContext, useEffect, useRef, useState } from "react";
import "./assets/scss/App.scss";
import { handleImageScale } from "./components/helpers/scaleHelper";
import Stage from "./components/Stage";
import AppContext from "./components/hooks/createContext";


const App = () => {
  const {
    clicks: [clicks],
    image: [, setImage],
    maskImg: [, setMaskImg],
    canvasCache: [, setCanvasCache],
    image_path: [image_path, setImagePath],  // 获取图像路径
  } = useContext(AppContext)!;

  const [imgShape, setImgShape] = useState<{height: number, width: number} | null>(null); // 图片的高宽
  const [gridScale, setGridScale] = useState<{height: number, width: number} | null>(null); // grid缩放因子

  // 存储每个mask的真值坐标点,用于重建mask
  const [masksTrueIndicesList, setMasksTrueIndicesList] = useState<number[][][] | null>(null); 
  // 存储图片grid与mask索引的映射关系,用于根据点击位置获取mask索引
  const [masksGrid, setMasksGrid] = useState<number[][] | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // 创建canvas引用


  useEffect(
    () => {
    if (!image_path) return;
    // 加载图像
    const url = new URL(image_path, location.origin);
    loadImage(url);
    reset_state()
    
    const parts = image_path.split('/');
    const fileName = parts[parts.length - 1];

    fetch('http://192.168.3.139:12307/get_mask_info', {
      method: 'POST', // 指定请求方法为 POST
      headers: {
        'Content-Type': 'application/json', // 设置请求头，表明请求体的格式是 JSON
      },
      body: JSON.stringify({
        fileName: fileName,
      }),
    })
    .then(res => res.json())
    .then(data => {
      // 处理数据
      console.log(data);
      if (data) {
        let masks_true_indices_list = data.masks_true_indices_list;
        let gridScale = data.gridScale;
        let masks_grid = data.masks_grid;
        let imgShape = data.imgShape;
        setMasksTrueIndicesList(masks_true_indices_list);
        setGridScale(gridScale);
        setMasksGrid(masks_grid);
        setImgShape(imgShape);
      }
    });
  }, [image_path]);

  const reset_state = () => {
    setMaskImg(null);
    setCanvasCache(null);
    canvasRef.current = null;
    
    setMasksTrueIndicesList(null);
    setGridScale(null);
    setMasksGrid(null);
    setImgShape(null);
  }

  const loadImage = async (url: URL) => {
    try {
      const img = new Image();
      img.src = url.href;
      img.onload = () => {
        const { height, width, samScale } = handleImageScale(img);
        img.width = width; 
        img.height = height; 
        setImage(img);
      };
    } catch (error) {
      console.log(error);
    }
  };

   // 初始化canvas
  useEffect(() => {
    if (imgShape) {
      const canvas = document.createElement("canvas");
      canvas.width = imgShape.width;
      canvas.height = imgShape.height;
      canvasRef.current = canvas;
    }
  }, [imgShape]);

  // 当鼠标发生变动时渲染masks
  useEffect(() => {
    if (!clicks)  return;
    getMaskIndexByClickPosition(clicks[0]);
  }, [clicks]);

  const getMaskIndexByClickPosition = (clicks: {x: number, y: number, clickType: number}) => {
    const {x, y, clickType} = clicks;
    // console.log(`x:${x}, y:${y}`);

    if (x < 0 || y < 0 || !gridScale || !masksGrid) return;
    const { width: widthScale, height: heightScale } = gridScale;

    let grid_x = Math.floor(x / widthScale);
    let grid_y = Math.floor(y / heightScale);
    // console.log(`grid_y:${grid_y}, grid_x:${grid_x}`);
    let newMaskIndex = masksGrid[grid_y][grid_x];

    mask2Image(newMaskIndex, clickType);
  }

  const mask2Image = (maskIndex: number | undefined, clickType: number ) => {
    // console.log("maskIndex", maskIndex);
    if (maskIndex == -1 || !masksTrueIndicesList || !imgShape) return;
    let true_indices = masksTrueIndicesList[maskIndex!];
    
    const {height, width} = imgShape;
    // const imgData = new Uint8ClampedArray(width * height * 4);   // 创建空图像

    // 用 canvasCache 深拷贝一份imgData
    // 拿到 canvasCache
    const canvas_ref = canvasRef.current;
    const ctx_ref = canvas_ref?.getContext("2d" ,{ willReadFrequently: true });
    const imgData_ref = ctx_ref?.getImageData(0, 0, width, height);
    const data_ref = imgData_ref!.data;
    const imgData = new Uint8ClampedArray(data_ref);

    
    for (let [i, j] of true_indices) {  // 遍历true_indices设置颜色
      const index = (i * width + j) * 4;
      imgData[index] = 0; // R
      imgData[index + 1] = 255; // G
      imgData[index + 2] = 255; // B
      imgData[index + 3] = 255; // A
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d",{ willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    const imageData = new ImageData(imgData, width, height);
    ctx?.putImageData(imageData, 0, 0);

    const image = new Image();
    image.src = canvas.toDataURL();
    setMaskImg(image);

    if (clickType === 0) {
      canvasRef.current = canvas;
      setCanvasCache(canvas);
    }
}
  return <Stage />;
};

export default App;
