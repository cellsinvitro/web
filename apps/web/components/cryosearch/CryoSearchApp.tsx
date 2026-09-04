"use client";

import React, { useState, useEffect } from "react";
import {
  LabModel,
  ContainerModel,
  RackModel,
  BoxModel,
  LabActivityModel,
  ReceivedRequest,
  SentRequest,
  AllowedUsersModel,
  ColorCodeConverter,
  CELL_LINE_COLORS,
} from "@/lib/cryosearch/types";
import {
  fetchCryoSearchState,
  saveCryoSearchState,
  type CryoSearchState,
} from "@/lib/api";
import BoxViewModal from "./BoxViewModal";
import CreateLabModal from "./modals/CreateLabModal";
import ConfigureCellLinesModal from "./modals/ConfigureCellLinesModal";
import AddNewDocModal, { DocParentType } from "./modals/AddNewDocModal";
import ItemOptionsModal, { ItemType } from "./modals/ItemOptionsModal";
import SendRequestModal from "./modals/SendRequestModal";
import AllowedUsersModal from "./modals/AllowedUsersModal";

// FAQ Data from mobile app FAQData.dart
const FAQ_ITEMS = [
  {
    q: "How to use CryoSearch Repository?",
    a: "Steps to start using CryoSearch:\n\n1. Go to the Repository section.\n2. Add your lab by clicking on the 'Create Lab' button.\n3. Within your lab, add a container (Dewar/Freezer) from the options menu.\n4. Similarly in the container, add different racks.\n5. In each rack, add boxes selecting the dimension (5x5, 9x9, or 10x10).\n6. Click on any box to open the interactive grid and store or revive cryovials.",
  },
  {
    q: "How to make an entry for stored cryovials?",
    a: "Click on the Box where you want to store vials. Click 'Store Cryovials' and select the vacant slots. Click 'Confirm Location' to enter cell line, passage, remarks, quality ratings, and stored date. Click 'Save' to finish.",
  },
  {
    q: "How can we Search the location of cells stored?",
    a: "Use the Search bar in the Repository section. Enter the name of the cell line (e.g. 'HeLa', 'MCF-7') or type 'vacant' to find empty slots. A list of matching boxes with their exact slot numbers will be displayed.",
  },
  {
    q: "How to make an entry for revived cryovials?",
    a: "Open the Box, click 'Revive Cryovials', and select the cell slot you wish to thaw. Click 'Revive', enter your post-thaw viability remarks and date, then confirm.",
  },
  {
    q: "How can we observe past storage and revival?",
    a: "Navigate to the 'Activities' tab to review a full chronological timeline of all storage and revival operations.",
  },
  {
    q: "How can we share a location with a lab mate?",
    a: "Click on the options menu (...) of any Lab, Container, Rack, or Box and select 'Share ID'. Share this ID with your collaborator. When they submit an Access Request with that ID, you will receive an approval notification in 'Access Requests'.",
  },
  {
    q: "How to Unshare a location with a lab mate?",
    a: "Go to the 'Access Requests' section and click 'Allowed Users'. Click 'Revoke Access' next to the collaborator to withdraw permissions.",
  },
];

export default function CryoSearchApp() {
  const [activeTab, setActiveTab] = useState<
    "repo" | "activities" | "access" | "help"
  >("repo");

  // State
  const [labs, setLabs] = useState<LabModel[]>([]);
  const [activities, setActivities] = useState<LabActivityModel[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ReceivedRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUsersModel[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [repoMode, setRepoMode] = useState<"my" | "shared">("my");
  const [sharedFilterType, setSharedFilterType] = useState<
    "Labs" | "Containers" | "Racks" | "Boxes"
  >("Labs");

  // Selected Box for Grid View
  const [selectedBox, setSelectedBox] = useState<BoxModel | null>(null);
  const [activeLabForCellLines, setActiveLabForCellLines] = useState<LabModel | null>(null);

  // Modals
  const [isCreateLabOpen, setIsCreateLabOpen] = useState(false);
  const [isConfigCellLinesOpen, setIsConfigCellLinesOpen] = useState(false);
  const [targetLabForConfig, setTargetLabForConfig] = useState<LabModel | null>(null);

  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [addDocParent, setAddDocParent] = useState<{
    type: DocParentType;
    name: string;
    id: string;
  } | null>(null);

  const [isItemOptionsOpen, setIsItemOptionsOpen] = useState(false);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<{
    type: ItemType;
    name: string;
    id: string;
    location: string;
    raw: any;
  } | null>(null);

  const [isSendRequestOpen, setIsSendRequestOpen] = useState(false);
  const [isAllowedUsersOpen, setIsAllowedUsersOpen] = useState(false);
  const [accessSubTab, setAccessSubTab] = useState<"received" | "sent">("received");

  // Load from storage on mount
  useEffect(() => {
    fetchCryoSearchState()
      .then((state) => {
        setLabs(state.labs);
        setActivities(state.activities);
        setReceivedRequests(state.receivedRequests);
        setSentRequests(state.sentRequests);
        setAllowedUsers(state.allowedUsers);
      })
      .catch((error) => {
        console.error("Failed to load CryoSearch state", error);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const currentState = (): CryoSearchState => ({
    labs,
    activities,
    receivedRequests,
    sentRequests,
    allowedUsers,
  });

  const persistState = (state: CryoSearchState) => {
    saveCryoSearchState(state).catch((error) => {
      console.error("Failed to save CryoSearch state", error);
    });
  };

  // Save changes
  const updateLabsState = (newLabs: LabModel[]) => {
    setLabs(newLabs);
    persistState({ ...currentState(), labs: newLabs });
  };

  const updateActivitiesState = (newActivities: LabActivityModel[]) => {
    setActivities(newActivities);
    persistState({ ...currentState(), activities: newActivities });
  };

  // Find lab by box location
  const getLabByBox = (box: BoxModel): LabModel | null => {
    const labId = box.location.split("/")[0];
    return labs.find((l) => l.id === labId) || labs[0] || null;
  };

  // Handle Box Cells Update from BoxViewModal
  const handleUpdateBoxCells = (
    boxId: string,
    updatedCells: any[],
    activity?: LabActivityModel
  ) => {
    const newLabs = labs.map((lab) => ({
      ...lab,
      containers: lab.containers.map((cont) => ({
        ...cont,
        racks: cont.racks.map((rack) => ({
          ...rack,
          boxes: rack.boxes.map((b) => {
            if (b.id === boxId) {
              return { ...b, boxCells: updatedCells };
            }
            return b;
          }),
        })),
      })),
    }));

    // Also update currently viewed box
    if (selectedBox && selectedBox.id === boxId) {
      setSelectedBox({ ...selectedBox, boxCells: updatedCells });
    }

    if (activity) {
      const newActs = [activity, ...activities];
      setActivities(newActs);
      persistState({
        labs: newLabs,
        activities: newActs,
        receivedRequests,
        sentRequests,
        allowedUsers,
      });
    } else {
      updateLabsState(newLabs);
    }
  };

  // Create Lab Handler
  const handleCreateLab = (labName: string, allowedCellLines: string[]) => {
    const newLab: LabModel = {
      id: `lab-${Date.now()}`,
      name: labName,
      admin: "user_me",
      adminName: "Lab Administrator",
      allowedUsers: [],
      allowedCellLine: allowedCellLines,
      containers: [],
    };
    updateLabsState([...labs, newLab]);
  };

  // Update Allowed Cell Lines Handler
  const handleSaveCellLines = (labId: string, updatedCellLines: string[]) => {
    const newLabs = labs.map((l) =>
      l.id === labId ? { ...l, allowedCellLine: updatedCellLines } : l
    );
    updateLabsState(newLabs);
  };

  // Create Child (Container, Rack, Box)
  const handleCreateChild = (
    parentType: DocParentType,
    parentId: string,
    childName: string,
    dimension: number = 9
  ) => {
    if (parentType === "Lab") {
      const newCont: ContainerModel = {
        id: `con-${Date.now()}`,
        name: childName,
        location: parentId,
        admin: "user_me",
        allowedUsers: [],
        racks: [],
      };
      const newLabs = labs.map((l) =>
        l.id === parentId ? { ...l, containers: [...l.containers, newCont] } : l
      );
      updateLabsState(newLabs);
    } else if (parentType === "Container") {
      const newRack: RackModel = {
        id: `rac-${Date.now()}`,
        name: childName,
        location: parentId,
        admin: "user_me",
        allowedUsers: [],
        boxes: [],
      };
      const newLabs = labs.map((l) => ({
        ...l,
        containers: l.containers.map((c) =>
          c.id === parentId ? { ...c, racks: [...c.racks, newRack] } : c
        ),
      }));
      updateLabsState(newLabs);
    } else if (parentType === "Rack") {
      // Find parent container & lab
      let parentContName = "Container";
      let parentLabName = "Lab";
      labs.forEach((l) => {
        l.containers.forEach((c) => {
          if (c.racks.some((r) => r.id === parentId)) {
            parentContName = c.name;
            parentLabName = l.name;
          }
        });
      });

      // Generate empty cells
      const totalCells = dimension * dimension;
      const initialCells = Array.from({ length: totalCells }, (_, i) => ({
        id: `cell-${Date.now()}-${i + 1}`,
        boxIndex: i + 1,
        isEmpty: true,
        name: "",
        passage: 0,
        storedBy: "",
        storedOn: "",
        entryId: "",
        remarksWhenStored: "",
        ratingsWhenStored: 0,
        extractedBy: "",
        extractedOn: "",
        feedbackWhenExtracted: "",
        ratingsWhenExtracted: 0,
      }));

      const newBox: BoxModel = {
        id: `box-${Date.now()}`,
        name: childName,
        location: `${parentId}`,
        locationNames: [parentLabName, parentContName, "Rack"],
        admin: "user_me",
        allowedUsers: [],
        dimension: dimension,
        boxCells: initialCells,
      };

      const newLabs = labs.map((l) => ({
        ...l,
        containers: l.containers.map((c) => ({
          ...c,
          racks: c.racks.map((r) =>
            r.id === parentId ? { ...r, boxes: [...r.boxes, newBox] } : r
          ),
        })),
      }));
      updateLabsState(newLabs);
    }
  };

  // Rename Item
  const handleRenameItem = (type: ItemType, id: string, newName: string) => {
    if (type === "Lab") {
      updateLabsState(labs.map((l) => (l.id === id ? { ...l, name: newName } : l)));
    } else if (type === "Container") {
      updateLabsState(
        labs.map((l) => ({
          ...l,
          containers: l.containers.map((c) =>
            c.id === id ? { ...c, name: newName } : c
          ),
        }))
      );
    } else if (type === "Rack") {
      updateLabsState(
        labs.map((l) => ({
          ...l,
          containers: l.containers.map((c) => ({
            ...c,
            racks: c.racks.map((r) => (r.id === id ? { ...r, name: newName } : r)),
          })),
        }))
      );
    } else if (type === "Box") {
      updateLabsState(
        labs.map((l) => ({
          ...l,
          containers: l.containers.map((c) => ({
            ...c,
            racks: c.racks.map((r) => ({
              ...r,
              boxes: r.boxes.map((b) => (b.id === id ? { ...b, name: newName } : b)),
            })),
          })),
        }))
      );
    }
  };

  // Delete Item
  const handleDeleteItem = (type: ItemType, id: string) => {
    if (type === "Lab") {
      updateLabsState(labs.filter((l) => l.id !== id));
    } else if (type === "Container") {
      updateLabsState(
        labs.map((l) => ({
          ...l,
          containers: l.containers.filter((c) => c.id !== id),
        }))
      );
    } else if (type === "Rack") {
      updateLabsState(
        labs.map((l) => ({
          ...l,
          containers: l.containers.map((c) => ({
            ...c,
            racks: c.racks.filter((r) => r.id !== id),
          })),
        }))
      );
    } else if (type === "Box") {
      updateLabsState(
        labs.map((l) => ({
          ...l,
          containers: l.containers.map((c) => ({
            ...c,
            racks: c.racks.map((r) => ({
              ...r,
              boxes: r.boxes.filter((b) => b.id !== id),
            })),
          })),
        }))
      );
    }
  };

  // Access Requests Handlers
  const handleGrantAccess = (reqId: string) => {
    const req = receivedRequests.find((r) => r.reqId === reqId);
    if (!req) return;

    const newAllowed: AllowedUsersModel = {
      userId: req.senderId,
      userName: req.senderName,
      userImage: req.senderImage,
      allowedItem: req.requestedItem,
      allowedItemType: req.requestedItemType,
      allowedItemName: req.requestedItemName,
    };

    const newAllowedList = [...allowedUsers, newAllowed];
    setAllowedUsers(newAllowedList);

    const remainingReqs = receivedRequests.filter((r) => r.reqId !== reqId);
    setReceivedRequests(remainingReqs);
    persistState({
      labs,
      activities,
      receivedRequests: remainingReqs,
      sentRequests,
      allowedUsers: newAllowedList,
    });
  };

  const handleDenyAccess = (reqId: string) => {
    const remaining = receivedRequests.filter((r) => r.reqId !== reqId);
    setReceivedRequests(remaining);
    persistState({ ...currentState(), receivedRequests: remaining });
  };

  const handleSendAccessRequest = (itemId: string) => {
    const newReq: SentRequest = {
      reqId: `req-sent-${Date.now()}`,
      adminName: "Lab Owner",
      adminId: "owner_user",
      adminImage: "",
      requestStatus: "Pending",
      requestedItem: itemId,
      requestedItemType: "Resource",
      requestedItemName: ["Repository", itemId],
    };
    const updated = [newReq, ...sentRequests];
    setSentRequests(updated);
    persistState({ ...currentState(), sentRequests: updated });
    alert(`Access request sent for ID: ${itemId}`);
  };

  const handleRevokeAccess = (userId: string, allowedItem: string) => {
    const updated = allowedUsers.filter(
      (u) => !(u.userId === userId && u.allowedItem === allowedItem)
    );
    setAllowedUsers(updated);
    persistState({ ...currentState(), allowedUsers: updated });
  };

  // Search Results across all boxes
  const allBoxes: BoxModel[] = [];
  labs.forEach((l) => {
    l.containers.forEach((c) => {
      c.racks.forEach((r) => {
        r.boxes.forEach((b) => {
          allBoxes.push({
            ...b,
            locationNames: [l.name, c.name, r.name, b.name],
          });
        });
      });
    });
  });

  const searchFilteredBoxes = (() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];

    if (q === "vacant") {
      return allBoxes
        .map((b) => {
          const vacantCells = b.boxCells.filter((c) => c.isEmpty);
          return {
            box: b,
            matchedIndices: vacantCells.map((c) => c.boxIndex),
          };
        })
        .filter((res) => res.matchedIndices.length > 0);
    }

    return allBoxes
      .map((b) => {
        const matched = b.boxCells.filter(
          (c) => !c.isEmpty && c.name.toLowerCase().includes(q)
        );
        return {
          box: b,
          matchedIndices: matched.map((c) => c.boxIndex),
        };
      })
      .filter((res) => res.matchedIndices.length > 0);
  })();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-slate-50/50 pb-16 sm:pb-20">
      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsCreateLabOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-pink-500"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Create Lab
          </button>
        </div>

        {/* Navigation Tabs matching the 5 mobile icons */}
        <div className="mb-6 flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("repo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "repo"
                ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
            <span>Repository</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "activities"
                ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Activities</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "access"
                ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
            <span>Access Requests</span>
            {receivedRequests.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pink-100 text-[10px] font-extrabold text-pink-700">
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("help")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "help"
                ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
            <span>FAQ & Info</span>
          </button>
        </div>

        {/* ======================================================= */}
        {/* TAB 1: REPOSITORY (My-Repo / Shared-Repo / Search) */}
        {/* ======================================================= */}
        {activeTab === "repo" && (
          <div>
            {/* Search & Mode Bar */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              {/* My-Repo vs Shared-Repo pill selector */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setRepoMode("my")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                    repoMode === "my"
                      ? "bg-pink-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  My-Repo
                </button>
                <button
                  type="button"
                  onClick={() => setRepoMode("shared")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                    repoMode === "shared"
                      ? "bg-pink-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Shared-Repo
                </button>
              </div>

              {/* Search Bar with "vacant" filter tip */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cell-lines or type 'vacant'..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/60 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                    clipRule="evenodd"
                  />
                </svg>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* If actively searching, show search results */}
            {searchTerm ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Search Results for &ldquo;{searchTerm}&rdquo;
                  </h3>
                  <span className="text-xs text-slate-500">
                    {searchFilteredBoxes.length} boxes found
                  </span>
                </div>

                {searchFilteredBoxes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No matching cryovials found.
                    <br />
                    Tip: Type <span className="font-mono text-slate-600">vacant</span> to find empty slots.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchFilteredBoxes.map(({ box, matchedIndices }, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedBox(box);
                          setActiveLabForCellLines(getLabByBox(box));
                        }}
                        className="cursor-pointer rounded-xl border border-pink-100 bg-pink-50/40 p-4 transition-all hover:border-pink-300 hover:bg-pink-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {box.locationNames.join(" > ")}
                          </span>
                          <span className="rounded-lg bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Open Box
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-slate-600">
                          <span className="font-medium text-slate-400">Matching Slots:</span>
                          {matchedIndices.map((slot) => (
                            <span
                              key={slot}
                              className="rounded bg-white px-1.5 py-0.2 border border-pink-200 text-pink-700 font-mono text-[10px]"
                            >
                              #{slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Tree Hierarchy Layout */
              <div className="space-y-4">
                {labs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="mx-auto h-12 w-12 text-slate-300"
                    >
                      <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
                    </svg>
                    <h3 className="mt-3 text-sm font-bold text-slate-800">
                      Repository is Empty
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Create your first laboratory to start organizing cryovials.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateLabOpen(true)}
                      className="mt-4 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500"
                    >
                      Create First Lab
                    </button>
                  </div>
                ) : (
                  labs.map((lab) => (
                    <div
                      key={lab.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* Lab Header */}
                      <div className="flex items-center justify-between bg-slate-50/80 px-5 py-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="h-4 w-4"
                            >
                              <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {lab.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{lab.containers.length} Containers</span>
                              <span>•</span>
                              <span>{lab.allowedCellLine.length} Allowed Cell-Lines</span>
                            </div>
                          </div>
                        </div>

                        {/* Lab Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAddDocParent({
                                type: "Lab",
                                name: lab.name,
                                id: lab.id,
                              });
                              setIsAddDocOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                          >
                            + Add Container
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForOptions({
                                type: "Lab",
                                name: lab.name,
                                id: lab.id,
                                location: "",
                                raw: lab,
                              });
                              setIsItemOptionsOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title="Lab Options"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Containers inside Lab */}
                      <div className="p-4 space-y-4">
                        {lab.containers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No containers in this lab. Click &ldquo;+ Add Container&rdquo; above.
                          </div>
                        ) : (
                          lab.containers.map((cont) => (
                            <div
                              key={cont.id}
                              className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5"
                            >
                              {/* Container Bar */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-blue-700 text-xs font-bold">
                                    C
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">
                                    {cont.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddDocParent({
                                        type: "Container",
                                        name: cont.name,
                                        id: cont.id,
                                      });
                                      setIsAddDocOpen(true);
                                    }}
                                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                                  >
                                    + Add Rack
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedItemForOptions({
                                        type: "Container",
                                        name: cont.name,
                                        id: cont.id,
                                        location: cont.location,
                                        raw: cont,
                                      });
                                      setIsItemOptionsOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700"
                                  >
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                      <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              {/* Racks inside Container */}
                              <div className="mt-2.5 space-y-2.5 pl-3">
                                {cont.racks.length === 0 ? (
                                  <div className="py-2 text-xs text-slate-400">
                                    No racks configured. Add a rack above.
                                  </div>
                                ) : (
                                  cont.racks.map((rack) => (
                                    <div
                                      key={rack.id}
                                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs"
                                    >
                                      {/* Rack Header */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                            R
                                          </span>
                                          <span className="text-xs font-semibold text-slate-800">
                                            {rack.name}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddDocParent({
                                                type: "Rack",
                                                name: rack.name,
                                                id: rack.id,
                                              });
                                              setIsAddDocOpen(true);
                                            }}
                                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                                          >
                                            + Add Box
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedItemForOptions({
                                                type: "Rack",
                                                name: rack.name,
                                                id: rack.id,
                                                location: rack.location,
                                                raw: rack,
                                              });
                                              setIsItemOptionsOpen(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-700"
                                          >
                                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                              <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Boxes inside Rack */}
                                      <div className="mt-2.5 flex flex-wrap gap-2">
                                        {rack.boxes.length === 0 ? (
                                          <div className="text-[11px] text-slate-400">
                                            No boxes yet. Click &ldquo;+ Add Box&rdquo;
                                          </div>
                                        ) : (
                                          rack.boxes.map((box) => {
                                            const occupiedCount = box.boxCells.filter(
                                              (c) => !c.isEmpty
                                            ).length;
                                            return (
                                              <div
                                                key={box.id}
                                                className="group relative flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-semibold text-blue-900 transition-all hover:border-blue-400 hover:bg-blue-100/70"
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedBox(box);
                                                    setActiveLabForCellLines(lab);
                                                  }}
                                                  className="flex items-center gap-1.5"
                                                >
                                                  <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className="h-3.5 w-3.5 text-blue-600"
                                                  >
                                                    <path
                                                      fillRule="evenodd"
                                                      d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                                                      clipRule="evenodd"
                                                    />
                                                  </svg>
                                                  <span>{box.name}</span>
                                                  <span className="rounded-full bg-blue-200/80 px-1.5 py-0.2 text-[9px] font-mono text-blue-800">
                                                    {occupiedCount}/{box.dimension * box.dimension}
                                                  </span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItemForOptions({
                                                      type: "Box",
                                                      name: box.name,
                                                      id: box.id,
                                                      location: box.location,
                                                      raw: box,
                                                    });
                                                    setIsItemOptionsOpen(true);
                                                  }}
                                                  className="ml-1 rounded p-0.5 text-blue-400 hover:text-blue-800"
                                                >
                                                  <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className="h-3 w-3"
                                                  >
                                                    <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 2: LAB ACTIVITIES LOG */}
        {/* ======================================================= */}
        {activeTab === "activities" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Lab Activity Log
                </h2>
                <p className="text-xs text-slate-500">
                  Audit trail of cryovial storage and revival events.
                </p>
              </div>

              {activities.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear activity history log?")) {
                      updateActivitiesState([]);
                    }
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear History
                </button>
              )}
            </div>

            {activities.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No activity recorded yet. Stored and revived cryovials will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((act, index) => {
                  const isStored = act.activityType === "Stored";
                  const { name, color } = ColorCodeConverter.parseCellLine(
                    act.cellLine || ""
                  );
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isStored
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {act.activityType}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {act.doneByName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {act.storedExtractedOn
                            ? new Date(
                                parseInt(act.storedExtractedOn, 10)
                              ).toLocaleString()
                            : ""}
                        </span>
                      </div>

                      {/* Path */}
                      <div className="text-xs font-medium text-slate-600">
                        {act.labName} &gt; {act.containerName} &gt; {act.rackName} &gt;{" "}
                        <span className="font-bold text-slate-900">{act.boxName}</span>{" "}
                        (Slots: {act.boxCells.join(", ")})
                      </div>

                      {/* Cell Details */}
                      {act.cellLine && (
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="font-semibold text-slate-800">
                            {name}
                          </span>
                          {act.elementPassage && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                              {act.elementPassage}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Feedback / Remarks */}
                      {act.feedbackWhenExtracted && (
                        <div className="mt-1 rounded-lg bg-white p-2 text-xs italic text-slate-600 border border-slate-200/60">
                          &ldquo;{act.feedbackWhenExtracted}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 3: ACCESS REQUESTS */}
        {/* ======================================================= */}
        {activeTab === "access" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Header & Sub-Tabs */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Access Management
                </h2>
                <p className="text-xs text-slate-500">
                  Manage collaborator requests and share laboratory items securely.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAllowedUsersOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                  </svg>
                  Allowed Users ({allowedUsers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setIsSendRequestOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-pink-500"
                >
                  + Send Request
                </button>
              </div>
            </div>

            {/* Sub-tab pills: Received vs Sent */}
            <div className="mb-4 flex w-fit rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAccessSubTab("received")}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  accessSubTab === "received"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Received Requests ({receivedRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setAccessSubTab("sent")}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  accessSubTab === "sent"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sent Requests ({sentRequests.length})
              </button>
            </div>

            {/* Received Requests */}
            {accessSubTab === "received" && (
              <div>
                {receivedRequests.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No pending access requests received.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map((req) => (
                      <div
                        key={req.reqId}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 font-bold text-pink-700">
                            {req.senderName && req.senderName[0] ? req.senderName[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {req.senderName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Requested {req.requestedItemType}:{" "}
                              <span className="font-semibold text-slate-700">
                                {req.requestedItemName.join(" > ")}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              ID: {req.requestedItem}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDenyAccess(req.reqId)}
                            className="rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGrantAccess(req.reqId)}
                            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                          >
                            Grant Access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sent Requests */}
            {accessSubTab === "sent" && (
              <div>
                {sentRequests.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No requests sent yet. Click &ldquo;+ Send Request&rdquo; to request access with an item ID.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((req) => (
                      <div
                        key={req.reqId}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {req.requestedItemName.join(" > ")}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            ID: {req.requestedItem}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            req.requestStatus === "Approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : req.requestStatus === "Denied"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {req.requestStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 4: FAQ & INFO */}
        {/* ======================================================= */}
        {activeTab === "help" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* FAQs (8 Cols) */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base font-bold text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="mb-6 text-xs text-slate-500">
                Bench guide and documentation for CryoSearch repository workflows.
              </p>

              <div className="space-y-3">
                {FAQ_ITEMS.map((faq, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all open:bg-white open:shadow-xs"
                  >
                    <summary className="cursor-pointer text-xs font-bold text-slate-900 list-none flex items-center justify-between">
                      <span>{faq.q}</span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </summary>
                    <div className="mt-3 text-xs text-slate-600 whitespace-pre-line leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* System Info & Reset (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  About CryoSearch
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  CryoSearch is built by <strong>CellsInVitro</strong> for biotechnology, pharmaceutical, and academic laboratories to eliminate cryovial misplacement and streamline cell banking.
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 space-y-1">
                  <div>Version 2.4.0 (Web Edition)</div>
                  <div>Compatible with CryoSearch Mobile Android/iOS</div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-amber-900">
                  Reset Demo Data
                </h4>
                <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
                  Clear all labs, boxes, vials, activities, and access lists stored for this account.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear all CryoSearch data for this account?")) {
                      const emptyState: CryoSearchState = {
                        labs: [],
                        activities: [],
                        receivedRequests: [],
                        sentRequests: [],
                        allowedUsers: [],
                      };
                      setLabs(emptyState.labs);
                      setActivities(emptyState.activities);
                      setReceivedRequests(emptyState.receivedRequests);
                      setSentRequests(emptyState.sentRequests);
                      setAllowedUsers(emptyState.allowedUsers);
                      persistState(emptyState);
                      alert("Data cleared!");
                    }
                  }}
                  className="mt-3 rounded-xl border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100"
                >
                  Reset Demo Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* MODALS */}
      {/* ======================================================= */}
      <BoxViewModal
        isOpen={selectedBox !== null}
        box={selectedBox}
        allowedLabCellLines={activeLabForCellLines?.allowedCellLine || []}
        onClose={() => setSelectedBox(null)}
        onUpdateBoxCells={handleUpdateBoxCells}
      />

      <CreateLabModal
        isOpen={isCreateLabOpen}
        onClose={() => setIsCreateLabOpen(false)}
        onCreateLab={handleCreateLab}
      />

      <ConfigureCellLinesModal
        isOpen={isConfigCellLinesOpen}
        lab={targetLabForConfig}
        onClose={() => {
          setIsConfigCellLinesOpen(false);
          setTargetLabForConfig(null);
        }}
        onSave={handleSaveCellLines}
      />

      {addDocParent && (
        <AddNewDocModal
          isOpen={isAddDocOpen}
          parentType={addDocParent.type}
          parentName={addDocParent.name}
          parentId={addDocParent.id}
          onClose={() => {
            setIsAddDocOpen(false);
            setAddDocParent(null);
          }}
          onCreate={handleCreateChild}
        />
      )}

      {selectedItemForOptions && (
        <ItemOptionsModal
          isOpen={isItemOptionsOpen}
          itemType={selectedItemForOptions.type}
          itemName={selectedItemForOptions.name}
          itemId={selectedItemForOptions.id}
          itemLocation={selectedItemForOptions.location}
          onClose={() => {
            setIsItemOptionsOpen(false);
            setSelectedItemForOptions(null);
          }}
          onOpenBox={
            selectedItemForOptions.type === "Box"
              ? () => {
                  setSelectedBox(selectedItemForOptions.raw);
                  setActiveLabForCellLines(
                    getLabByBox(selectedItemForOptions.raw)
                  );
                }
              : undefined
          }
          onRename={(newName) =>
            handleRenameItem(
              selectedItemForOptions.type,
              selectedItemForOptions.id,
              newName
            )
          }
          onAddChild={
            selectedItemForOptions.type !== "Box"
              ? () => {
                  setAddDocParent({
                    type: selectedItemForOptions.type as DocParentType,
                    name: selectedItemForOptions.name,
                    id: selectedItemForOptions.id,
                  });
                  setIsAddDocOpen(true);
                }
              : undefined
          }
          onConfigureCellLines={
            selectedItemForOptions.type === "Lab"
              ? () => {
                  setTargetLabForConfig(selectedItemForOptions.raw);
                  setIsConfigCellLinesOpen(true);
                }
              : undefined
          }
          onDelete={() =>
            handleDeleteItem(
              selectedItemForOptions.type,
              selectedItemForOptions.id
            )
          }
        />
      )}

      <SendRequestModal
        isOpen={isSendRequestOpen}
        onClose={() => setIsSendRequestOpen(false)}
        onSendRequest={handleSendAccessRequest}
      />

      <AllowedUsersModal
        isOpen={isAllowedUsersOpen}
        users={allowedUsers}
        onClose={() => setIsAllowedUsersOpen(false)}
        onRevokeAccess={handleRevokeAccess}
      />
    </div>
  );
}
