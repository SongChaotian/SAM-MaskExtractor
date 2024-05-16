# SAM-MaskExtractor

该存储库用于使用SAM（Segment Anything Model）对图片进行标注并导出结果。



## 快速开始

### 后端

#### 安装依赖

```shell
# Install with pip:
pip install -r requirements.txt
```



#### 下载SAM权重

点击以下链接下载`vit_h`模型文件： [ViT-H SAM model](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth)

将下载的模型文件放入当前项目目录中，然后在`app.py`文件中初始化时指定路径和设备：

```python
checkpoint_path = "./sam_vit_h_4b8939.pth"
sam = SAM(model_type="vit_h", checkpoint=checkpoint_path, device="cuda:0")
```



#### 启动后端项目

在启动项目之前，如果有需要，请在`app.py`文件的最后一行配置`ip`和`port`：

```python
app.run(host='0.0.0.0', port=12307)
```

运行以下命令启动后端项目：

```python
python app.py
```



### 前端

进入前端文件夹 `frontend`

#### 安装依赖

```
yarn
```

#### 启动前端项目

```
yarn start
```

确保前端请求的`ip`和端口号与后端配置的对应。



## 进行分割

- 在后端项目中创建一个文件夹：`tgt_images`
- 在前端项目中创建一个文件夹：`images`

将待分割的图片分别放入前后端项目创建的文件夹中。然后在前端选择图片时可以直接进行分割。

## 