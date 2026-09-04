// Types and models for CryoSearch, directly reflecting the Flutter mobile app models

export interface CellElement {
  id: string;
  isEmpty: boolean;
  name: string; // Stored as "CellLineName%CLC%colorCode" or plain name
  boxIndex: number; // 1-based index in the grid
  passage: number;
  storedOn: string; // Milliseconds timestamp string
  storedBy: string; // Format: "Name-UserId"
  entryId: string;
  extractedBy: string;
  extractedOn: string;
  remarksWhenStored: string;
  ratingsWhenStored: number; // 0 to 5
  feedbackWhenExtracted: string;
  ratingsWhenExtracted: number; // 0 to 5
  isCellSelectedByUser?: boolean;
}

export interface BoxModel {
  id: string;
  name: string;
  location: string; // e.g. "lab1/con1/rac1"
  locationNames: string[]; // e.g. ["Main Lab", "Dewar Tank A", "Rack 1"]
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  dimension: number; // 5 (5x5=25), 9 (9x9=81), 10 (10x10=100)
  boxCells: CellElement[];
}

export interface RackModel {
  id: string;
  name: string;
  location: string;
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  boxes: BoxModel[];
}

export interface ContainerModel {
  id: string;
  name: string;
  location: string;
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  racks: RackModel[];
}

export interface LabModel {
  id: string;
  name: string;
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  allowedCellLine: string[]; // Array of strings formatted as "CellLineName%CLC%ColorCode"
  containers: ContainerModel[];
}

export interface LabActivityModel {
  doneById: string;
  doneByName: string;
  doneByImage: string;
  doneOn: string; // Milliseconds timestamp
  storedExtractedOn: string;
  activityType: "Stored" | "Revived";
  labName: string;
  containerName: string;
  rackName: string;
  boxName: string;
  boxCells: number[];
  elementPassage?: string;
  cellLine?: string;
  feedbackWhenExtracted?: string;
}

export interface ReceivedRequest {
  reqId: string;
  senderName: string;
  senderId: string;
  senderImage: string;
  requestedItem: string; // e.g. "lab0-con0-rac0"
  requestedItemType: string;
  requestedItemName: string[];
  showDetails?: boolean;
}

export interface SentRequest {
  reqId: string;
  adminName: string;
  adminId: string;
  adminImage: string;
  requestStatus: "Pending" | "Approved" | "Denied";
  requestedItem: string;
  requestedItemType: string;
  requestedItemName: string[];
  showDetails?: boolean;
}

export interface AllowedUsersModel {
  userId: string;
  userName: string;
  userImage: string;
  allowedItem: string;
  allowedItemType: string;
  allowedItemName: string[];
  showDetails?: boolean;
}

// -------------------------------------------------------------
// EXACT 20 COLOR DEFINITIONS FROM CellLineColorPicker.dart
// ORDER IS CRITICAL TO PRESERVE SAME CODE MAPPING (0 to 19)
// -------------------------------------------------------------
export interface ColorDef {
  code: number;
  name: string;
  hex: string;
  border: string;
  text: string;
}

export const CELL_LINE_COLORS: ColorDef[] = [
  // 0: Colors.amber[100]
  { code: 0, name: "Amber", hex: "#ffecb3", border: "#ffd54f", text: "#795548" },
  // 1: Colors.blue[100]
  { code: 1, name: "Blue", hex: "#bbdefb", border: "#64b5f6", text: "#1565c0" },
  // 2: Colors.cyan[100]
  { code: 2, name: "Cyan", hex: "#b2ebf2", border: "#4dd0e1", text: "#00838f" },
  // 3: Colors.deepOrange[100]
  { code: 3, name: "Deep Orange", hex: "#ffccbc", border: "#ff8a65", text: "#d84315" },
  // 4: Colors.deepPurple[100]
  { code: 4, name: "Deep Purple", hex: "#d1c4e9", border: "#9575cd", text: "#4527a0" },
  // 5: Colors.green[100]
  { code: 5, name: "Green", hex: "#c8e6c9", border: "#81c784", text: "#2e7d32" },
  // 6: Colors.indigo[200]
  { code: 6, name: "Indigo", hex: "#9fa8da", border: "#5c6bc0", text: "#1a237e" },
  // 7: Colors.lightBlue[100]
  { code: 7, name: "Light Blue", hex: "#b3e5fc", border: "#4fc3f7", text: "#0277bd" },
  // 8: Colors.lightGreen[100]
  { code: 8, name: "Light Green", hex: "#dcedc8", border: "#aed581", text: "#33691e" },
  // 9: Colors.lime[100]
  { code: 9, name: "Lime", hex: "#f0f4c3", border: "#dce775", text: "#827717" },
  // 10: Colors.orange[100]
  { code: 10, name: "Orange", hex: "#ffe0b2", border: "#ffb74d", text: "#e65100" },
  // 11: Colors.pink[100]
  { code: 11, name: "Pink", hex: "#f8bbd0", border: "#f06292", text: "#ad1457" },
  // 12: Colors.purple[100]
  { code: 12, name: "Purple", hex: "#e1bee7", border: "#ba68c8", text: "#6a1b9a" },
  // 13: Colors.teal[100]
  { code: 13, name: "Teal", hex: "#b2dfdb", border: "#4db6ac", text: "#004d40" },
  // 14: Colors.yellow[100]
  { code: 14, name: "Yellow", hex: "#fff9c4", border: "#fff176", text: "#f57f17" },
  // 15: Colors.red[100]
  { code: 15, name: "Red", hex: "#ffcdd2", border: "#e57373", text: "#c62828" },
  // 16: Colors.indigoAccent[100]
  { code: 16, name: "Indigo Accent", hex: "#8c9eff", border: "#3d5afe", text: "#1a237e" },
  // 17: Colors.orangeAccent[100]
  { code: 17, name: "Orange Accent", hex: "#ffd180", border: "#ff9100", text: "#bf360c" },
  // 18: Colors.pinkAccent[100]
  { code: 18, name: "Pink Accent", hex: "#ff80ab", border: "#f50057", text: "#880e4f" },
  // 19: Colors.greenAccent[100]
  { code: 19, name: "Green Accent", hex: "#b9f6ca", border: "#00e676", text: "#1b5e20" },
];

export class ColorCodeConverter {
  static convertColorIntoCode(colorHex: string): number {
    const lower = colorHex.toLowerCase();
    const idx = CELL_LINE_COLORS.findIndex(
      (c) => c.hex.toLowerCase() === lower
    );
    return idx !== -1 ? idx : 0;
  }

  static convertCodeIntoColor(code: number): ColorDef {
    const defaultColor = CELL_LINE_COLORS[0] as ColorDef;
    if (code >= 0 && code < CELL_LINE_COLORS.length) {
      return (CELL_LINE_COLORS[code] as ColorDef) || defaultColor;
    }
    return defaultColor;
  }

  static parseCellLine(cellLineNameWithCode: string): {
    name: string;
    code: number;
    color: ColorDef;
  } {
    const defaultColor = CELL_LINE_COLORS[0] as ColorDef;
    if (!cellLineNameWithCode) {
      return {
        name: "",
        code: 0,
        color: defaultColor,
      };
    }
    const parts = cellLineNameWithCode.split("%CLC%");
    const name = parts[0] || "";
    const secondPart = parts[1] ?? "";
    const code = parts.length > 1 ? parseInt(secondPart, 10) || 0 : 0;
    return {
      name,
      code,
      color: ColorCodeConverter.convertCodeIntoColor(code),
    };
  }

  static formatCellLine(name: string, code: number): string {
    return `${name.trim()}%CLC%${code}`;
  }
}
