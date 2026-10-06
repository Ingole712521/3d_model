import * as THREE from 'three';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

type GltfJson = {
  accessors?: GltfAccessor[];
  bufferViews?: { buffer?: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  meshes?: { primitives?: GltfPrimitive[] }[];
  nodes?: GltfNode[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
};

type GltfAccessor = {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  normalized?: boolean;
};

type GltfPrimitive = {
  attributes?: { POSITION?: number; NORMAL?: number; COLOR_0?: number };
  indices?: number;
  mode?: number;
};

type GltfNode = {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};

const COMPONENT = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
} as const;

const ELEMENT_SIZE: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};

export function groupFromGlb(data: ArrayBuffer): THREE.Group {
  const view = new DataView(data);
  if (data.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('The reconstruction file is not a GLB model.');
  }

  let offset = 12;
  let json: GltfJson | null = null;
  let bin = new Uint8Array();
  while (offset + 8 <= data.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === JSON_CHUNK) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, start, length))) as GltfJson;
    } else if (type === BIN_CHUNK) {
      bin = new Uint8Array(data.slice(start, start + length));
    }
    offset = start + length;
  }
  if (!json) throw new Error('The GLB model is missing its scene description.');

  const group = new THREE.Group();
  const sceneIndex = json.scene ?? 0;
  const sceneNodes = json.scenes?.[sceneIndex]?.nodes;
  if (sceneNodes && sceneNodes.length > 0) {
    for (const nodeIndex of sceneNodes) addNode(json, bin, nodeIndex, group);
  } else {
    (json.meshes ?? []).forEach((_, meshIndex) => group.add(meshObject(json, bin, meshIndex)));
  }

  if (group.children.length === 0) {
    throw new Error('The reconstructed GLB does not contain geometry.');
  }
  return group;
}

function addNode(json: GltfJson, bin: Uint8Array, nodeIndex: number, parent: THREE.Object3D) {
  const node = json.nodes?.[nodeIndex];
  if (!node) return;
  const object = new THREE.Group();
  if (node.matrix && node.matrix.length === 16) {
    object.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
  } else {
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
  }
  if (node.mesh !== undefined) object.add(meshObject(json, bin, node.mesh));
  parent.add(object);
  for (const child of node.children ?? []) addNode(json, bin, child, object);
}

function meshObject(json: GltfJson, bin: Uint8Array, meshIndex: number): THREE.Object3D {
  const holder = new THREE.Group();
  const primitives = json.meshes?.[meshIndex]?.primitives ?? [];
  for (const primitive of primitives) {
    const mode = primitive.mode ?? 4;
    if (mode !== 4 && mode !== 0) continue;
    const geometry = geometryFromPrimitive(json, bin, primitive);
    if (mode === 0) {
      const hasColor = geometry.getAttribute('color') !== undefined;
      holder.add(
        new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            color: '#ffffff',
            vertexColors: hasColor,
            size: 0.02,
            sizeAttenuation: true,
          }),
        ),
      );
      continue;
    }
    const hasColor = geometry.getAttribute('color') !== undefined;
    holder.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: hasColor ? '#ffffff' : '#C8C2B8',
          vertexColors: hasColor,
          roughness: 0.86,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
      ),
    );
  }
  return holder;
}

function geometryFromPrimitive(json: GltfJson, bin: Uint8Array, primitive: GltfPrimitive): THREE.BufferGeometry {
  const positionAccessor = primitive.attributes?.POSITION;
  if (positionAccessor === undefined) throw new Error('The reconstructed mesh has no vertex positions.');
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(readFloats(json, bin, positionAccessor, 3), 3));

  if (primitive.attributes?.NORMAL !== undefined) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(readFloats(json, bin, primitive.attributes.NORMAL, 3), 3));
  } else {
    geometry.computeVertexNormals();
  }

  if (primitive.attributes?.COLOR_0 !== undefined) {
    const colors = readFloats(json, bin, primitive.attributes.COLOR_0, 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  if (primitive.indices !== undefined) {
    geometry.setIndex(new THREE.BufferAttribute(readIndices(json, bin, primitive.indices), 1));
  }
  return geometry;
}

function readFloats(json: GltfJson, bin: Uint8Array, accessorIndex: number, wantedSize: number): Float32Array {
  const accessor = requireAccessor(json, accessorIndex);
  const itemSize = ELEMENT_SIZE[accessor.type];
  if (!itemSize) throw new Error('The GLB model uses an unsupported data type.');
  const source = readComponents(json, bin, accessor);
  const count = accessor.count;
  const output = new Float32Array(count * wantedSize);
  for (let index = 0; index < count; index += 1) {
    for (let channel = 0; channel < wantedSize; channel += 1) {
      output[index * wantedSize + channel] = channel < itemSize ? source[index * itemSize + channel] : 0;
    }
  }
  return output;
}

function readIndices(json: GltfJson, bin: Uint8Array, accessorIndex: number): Uint16Array | Uint32Array {
  const accessor = requireAccessor(json, accessorIndex);
  const source = readComponents(json, bin, accessor);
  if (accessor.componentType === 5125) return Uint32Array.from(source);
  return Uint16Array.from(source);
}

function readComponents(json: GltfJson, bin: Uint8Array, accessor: GltfAccessor): Float32Array {
  if (accessor.bufferView === undefined) {
    throw new Error('The GLB model uses sparse data this viewer cannot read.');
  }
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView || bufferView.buffer !== undefined && bufferView.buffer !== 0) {
    throw new Error('The GLB model references a missing buffer.');
  }
  const Component = COMPONENT[accessor.componentType as keyof typeof COMPONENT];
  const itemSize = ELEMENT_SIZE[accessor.type];
  if (!Component || !itemSize) throw new Error('The GLB model uses an unsupported data type.');

  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = bufferView.byteStride ?? itemSize * Component.BYTES_PER_ELEMENT;
  const output = new Float32Array(accessor.count * itemSize);
  const bytesPerElement = Component.BYTES_PER_ELEMENT;
  for (let index = 0; index < accessor.count; index += 1) {
    const elementStart = start + index * stride;
    const slice = bin.slice(elementStart, elementStart + itemSize * bytesPerElement);
    const values = new Component(slice.buffer, slice.byteOffset, itemSize);
    for (let channel = 0; channel < itemSize; channel += 1) {
      let value = values[channel];
      if (accessor.normalized) {
        if (accessor.componentType === 5121) value /= 255;
        else if (accessor.componentType === 5123) value /= 65535;
        else if (accessor.componentType === 5120) value = Math.max(value / 127, -1);
        else if (accessor.componentType === 5122) value = Math.max(value / 32767, -1);
      }
      output[index * itemSize + channel] = value;
    }
  }
  return output;
}

function requireAccessor(json: GltfJson, index: number): GltfAccessor {
  const accessor = json.accessors?.[index];
  if (!accessor) throw new Error('The GLB model is missing mesh data.');
  return accessor;
}
