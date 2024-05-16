from flask import Flask, request, jsonify
from flask_cors import CORS  # 解决跨域请求

import json
import math
import cv2
import numpy as np
from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator

app = Flask(__name__)


class SAM():
    def __init__(self, model_type="vit_h", checkpoint=None, device="cuda"):  
        self.sam = sam_model_registry[model_type](checkpoint=checkpoint)
        self.sam.to(device=device)
        self.configure_mask_generator()
        
        
    def configure_mask_generator(
        self, 
        points_per_side=32, 
        points_per_batch=256, 
        pred_iou_thresh=0.85, 
        stability_score_thresh=0.9, 
        crop_n_layers=1, 
        crop_n_points_downscale_factor=2
    ):
        """初始化并配置 Mask 生成器，调整参数以控制 Mask 的数量和质量, 启用裁剪和后处理可以进一步提升效果

        Args:
            points_per_side (int, optional): 每条边上采样点的数量，用于生成采样格点。如果为 None，则使用 point_grids 指定。默认为 32。
            points_per_batch (int, optional): 每批次处理的采样点数量。默认为 64。
            pred_iou_thresh (float, optional): 预测的 IoU 阈值，低于此阈值的 Mask 将被过滤。默认为 0.88。
            stability_score_thresh (float, optional): 稳定性得分阈值，用于过滤质量较差的遮罩。默认为 0.95。
            crop_n_layers (int, optional): 图像裁剪层数，可以提高对小目标的识别。默认为 0。
            crop_n_points_downscale_factor (int, optional): 在裁剪上缩小采样点数的比例，减少计算量。默认为 1。
        """
        self.mask_generator = SamAutomaticMaskGenerator(  
            model=self.sam,
            points_per_side=points_per_side,
            points_per_batch=points_per_batch,
            pred_iou_thresh=pred_iou_thresh,
            stability_score_thresh=stability_score_thresh,
            crop_n_layers=crop_n_layers,
            crop_n_points_downscale_factor=crop_n_points_downscale_factor,
        )
        
        
    def run(self, image_path):
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        height, width, _ = image.shape  # 获取图片的宽和高, (h, w, c)
        
        masks = self.mask_generator.generate(image)
        print(len(masks))
        data = self.generate_mask_info(masks, height, width, gridSize=128)
        return data
    
    
    def generate_mask_info(self, anns, height, width, gridSize=128):
        if len(anns) == 0:
            return
        
        imgShape = {
            "height": height,
            "width": width
        }

        masks_grid = np.full((gridSize + 1, gridSize + 1), -1)
        # 获取图片的缩放因子
        gridScale = {
            "height": height / gridSize,
            "width": width / gridSize
        }
        
        masks_true_indices_list = []
        sorted_anns = sorted(anns, key=(lambda x: x['area']), reverse=True)   # 按 mask 面积降序排序
        for index, ann in enumerate(sorted_anns):  # 遍历每个mask
            bbox = ann['bbox']  # XYWH
            
            # 图像的uv坐标系和 数组的xy坐标相反
            lt_x, lt_y = bbox[1], bbox[0]  # left-top左上角坐标
            rb_x, rb_y = lt_x + bbox[3], lt_y + bbox[2]  # right-bottom右下角坐标
            
            grid_lt_x = math.floor(lt_x / gridScale["height"])
            grid_lt_y = math.floor(lt_y / gridScale["width"])
            grid_rb_x = math.ceil(rb_x / gridScale['height'])
            grid_rb_y = math.ceil(rb_y / gridScale['width'])

            x_range = np.arange(grid_lt_x, grid_rb_x)
            y_range = np.arange(grid_lt_y, grid_rb_y)
            i_grid, j_grid = np.meshgrid(x_range, y_range)
            dx = ((i_grid + 0.5) * gridScale["height"]).astype(int)
            dy = ((j_grid + 0.5) * gridScale["width"]).astype(int)
            valid_mask = ann['segmentation'][dx, dy]
            masks_grid[i_grid[valid_mask], j_grid[valid_mask]] = index

            true_indices = np.argwhere(ann['segmentation'] > 0).tolist()
            masks_true_indices_list.append(true_indices)
        
        data = {
            "masks_true_indices_list": masks_true_indices_list,
            "masks_grid": masks_grid.tolist(),
            "gridScale": gridScale,
            "imgShape": imgShape,
        }
        return data


checkpoint_path = "/pvc_user/songchaotian/projects/segment-anything/sam_vit_h_4b8939.pth"
sam = SAM(model_type="vit_h", checkpoint=checkpoint_path, device="cuda:0")


@app.route('/configure_mask_generator', methods=['POST'])
def configure_mask_generator():
    data = request.get_json()
    
    sam.configure_mask_generator(
        points_per_side=data['points_per_side'] if "points_per_side" in data else 32, 
        points_per_batch=data['points_per_batch'] if "points_per_batch" in data else 256, 
        pred_iou_thresh=data['pred_iou_thresh'] if "pred_iou_thresh" in data else 0.85, 
        stability_score_thresh=data['stability_score_thresh'] if "stability_score_thresh" in data else 0.9, 
        crop_n_layers=data['crop_n_layers'] if "crop_n_layers" in data else 1, 
        crop_n_points_downscale_factor=data['crop_n_points_downscale_factor'] if "crop_n_points_downscale_factor" in data else 2, 
    )
    return jsonify({"msg": "success"})

@app.route('/get_mask_info', methods=['POST'])
def get_mask_info():
    data = request.get_json() 
    fileName = data['fileName']
    
    mask_info = sam.run(f"./tgt_images/{fileName}")
    return jsonify(mask_info)


if __name__ == '__main__':
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    # app.run(host='0.0.0.0', port=12307, debug=True)  # 8443 ——> 32793
    app.run(host='0.0.0.0', port=12307)  # 8443 ——> 32793