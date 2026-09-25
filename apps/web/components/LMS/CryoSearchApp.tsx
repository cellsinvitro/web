"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
} from "@/lib/cyrosearch/types";
import {
  fetchCryoSearchState,
  saveCryoSearchState,
  sendCryoInvite,
  getCryoInvitePreview,
  acceptCryoInvite,
  fetchLmsUserAccess,
  type CryoInvitePreview,
  type CryoSearchState,
} from "@/lib/api";
import GlobalLoader from "@/components/GlobalLoader";
import BoxViewModal from "./BoxViewModal";
import CreateLabModal from "./modals/CreateLabModal";
import ConfigureCellLinesModal from "./modals/ConfigureCellLinesModal";
import AddNewDocModal, { DocParentType } from "./modals/AddNewDocModal";
import ItemOptionsModal, { ItemType } from "./modals/ItemOptionsModal";
import SendRequestModal from "./modals/SendRequestModal";
import AllowedUsersModal from "./modals/AllowedUsersModal";
import LmsPurchaseModal from "./LmsPurchaseModal";

import { LabWorkspaceProvider } from "@/context/LabWorkspaceContext";
import CryoBudgetWrapper from "./CryoBudgetWrapper";
import CryoLabLogbookWrapper from "./CryoLabLogbookWrapper";
import StockDashboard from "./stock/StockDashboard";
import StockInventory from "./stock/StockInventory";
import StockItemDetail from "./stock/StockItemDetail";
import StockIssue from "./stock/StockIssue";
import StockActivity from "./stock/StockActivity";
import StockSettings from "./stock/StockSettings";

export default function CryoSearchApp() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "repo" | "access" | "stock" | "budget" | "logbook"
  >(() => {
    if (tabParam === "stock" || tabParam === "budget" || tabParam === "access" || tabParam === "logbook") {
      return tabParam;
    }
    return "repo";
  });

  // State
  const [labs, setLabs] = useState<LabModel[]>([]);
  const [activities, setActivities] = useState<LabActivityModel[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ReceivedRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUsersModel[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // LMS Section Access & Paywall
  const [userAccess, setUserAccess] = useState<{
    isAdmin: boolean;
    hasFullAccess: boolean;
    sections: string[];
  } | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseTargetSection, setPurchaseTargetSection] = useState<string | undefined>(undefined);

  const loadUserAccess = useCallback(async () => {
    try {
      const res = await fetchLmsUserAccess();
      setUserAccess(res);
    } catch {
      setUserAccess({ isAdmin: false, hasFullAccess: false, sections: ["lms_access"] });
    }
  }, []);

  useEffect(() => {
    loadUserAccess();
  }, [loadUserAccess]);

  const isSectionUnlocked = useCallback(
    (key: string) => {
      if (!userAccess) return false;
      if (userAccess.isAdmin || userAccess.hasFullAccess) return true;
      return userAccess.sections.includes(key);
    },
    [userAccess]
  );

  const handleTabSelect = (tab: "repo" | "access" | "stock" | "budget" | "logbook") => {
    const sectionMap: Record<string, string> = {
      repo: "lms_repo",
      stock: "lms_stock",
      budget: "lms_budget",
      logbook: "lms_logbook",
      access: "lms_access",
    };

    const targetKey = sectionMap[tab];
    setActiveTab(tab);
    if (targetKey && targetKey !== "lms_access" && userAccess && !isSectionUnlocked(targetKey)) {
      setPurchaseTargetSection(targetKey);
      setIsPurchaseModalOpen(true);
    }
  };

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

  // ── Invite acceptance ──
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<CryoInvitePreview | null>(null);
  const [inviteState, setInviteState] = useState<
    "idle" | "loading" | "ready" | "accepting" | "accepted" | "error"
  >("idle");
  const [inviteError, setInviteError] = useState<string>("");

  // Persist token across login redirect via sessionStorage
  useEffect(() => {
    const paramToken = searchParams.get("invite");
    const storedToken =
      typeof window !== "undefined" ? sessionStorage.getItem("cryoInviteToken") : null;
    const token = paramToken || storedToken;
    if (!token) return;

    if (paramToken) {
      sessionStorage.setItem("cryoInviteToken", paramToken);
      // Remove the param from the URL without a full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.toString());
    }

    setInviteToken(token);
    setInviteState("loading");
    setActiveTab("access");

    getCryoInvitePreview(token)
      .then((preview) => {
        setInvitePreview(preview);
        setInviteState("ready");
      })
      .catch((err: unknown) => {
        setInviteError(err instanceof Error ? err.message : "Invalid invite link");
        setInviteState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptInvite = useCallback(async () => {
    if (!inviteToken) return;
    setInviteState("accepting");
    setInviteError("");
    try {
      await acceptCryoInvite(inviteToken);
      sessionStorage.removeItem("cryoInviteToken");
      setInviteState("accepted");
      // Refresh state so the accepted item shows in the user's shared repo
      const fresh = await fetchCryoSearchState();
      setLabs(fresh.labs);
      setActivities(fresh.activities);
      setReceivedRequests(fresh.receivedRequests);
      setSentRequests(fresh.sentRequests);
      setAllowedUsers(fresh.allowedUsers);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to accept invite");
      setInviteState("error");
    }
  }, [inviteToken]);

  const handleDismissInvite = useCallback(() => {
    sessionStorage.removeItem("cryoInviteToken");
    setInviteToken(null);
    setInvitePreview(null);
    setInviteState("idle");
    setInviteError("");
  }, []);

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

  const handleSendEmailInvite = async (email: string, itemId: string) => {
    await sendCryoInvite(email, itemId);
    // No local state change needed — the invite lives server-side.
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
    return <GlobalLoader fullScreen={false} sublabel="Loading CryoSearch..." />;
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

        {/* ── Invite acceptance banner ── */}
        {inviteState !== "idle" && (
          <div className="mb-5">
            {/* Loading */}
            {inviteState === "loading" && (
              <div className="flex items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4">
                <svg className="h-5 w-5 animate-spin text-pink-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                </svg>
                <span className="text-xs font-semibold text-pink-700">Loading invite…</span>
              </div>
            )}

            {/* Ready — show accept card */}
            {inviteState === "ready" && invitePreview && (
              <div className="overflow-hidden rounded-2xl border border-pink-300 bg-gradient-to-r from-pink-50 to-rose-50 shadow-sm">
                {/* Coloured top strip */}
                <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white shadow">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                          <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                          <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          You&apos;ve been invited to access a shared repository item
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          From <span className="font-semibold text-slate-700">{invitePreview.ownerName}</span>
                        </p>
                        {/* Item breadcrumb */}
                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] shadow-xs border border-pink-200">
                          <span className="font-bold text-pink-700 uppercase tracking-wide text-[10px]">
                            {invitePreview.itemType}
                          </span>
                          <span className="text-slate-300 mx-0.5">·</span>
                          <span className="font-medium text-slate-700">
                            {invitePreview.itemPath.join(" › ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDismissInvite}
                      className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                      title="Dismiss"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptInvite}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-pink-500"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      Accept Access
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissInvite}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Accepting spinner */}
            {inviteState === "accepting" && (
              <div className="flex items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4">
                <svg className="h-5 w-5 animate-spin text-pink-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                </svg>
                <span className="text-xs font-semibold text-pink-700">Accepting invite…</span>
              </div>
            )}

            {/* Success */}
            {inviteState === "accepted" && invitePreview && (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Access granted!</p>
                    <p className="text-[11px] text-emerald-700">
                      You now have access to{" "}
                      <span className="font-semibold">{invitePreview.itemPath.join(" › ")}</span>{" "}
                      from <span className="font-semibold">{invitePreview.ownerName}</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismissInvite}
                  className="shrink-0 rounded-lg p-1 text-emerald-500 hover:bg-emerald-100"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Error (expired, used, wrong email, etc.) */}
            {inviteState === "error" && (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-900">Invite could not be processed</p>
                    <p className="text-[11px] text-red-700">{inviteError || "This invite link is invalid, expired, or has already been used."}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismissInvite}
                  className="shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-100"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs matching the 5 mobile icons */}
        <div className="mb-6 flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm scrollbar-none items-center">
          <button
            type="button"
            onClick={() => handleTabSelect("repo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${activeTab === "repo"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
            <span>CryoSearch</span>
            {!isSectionUnlocked("lms_repo") && <span className="text-[11px] opacity-75">🔒</span>}
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect("logbook")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${activeTab === "logbook"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
            </svg>
            <span>Log Book</span>
            {!isSectionUnlocked("lms_logbook") && <span className="text-[11px] opacity-75">🔒</span>}
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect("access")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${activeTab === "access"
              ? "bg-pink-600 text-white shadow-sm"
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
            onClick={() => handleTabSelect("stock")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${activeTab === "stock"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <span>Stock Management</span>
            {!isSectionUnlocked("lms_stock") && <span className="text-[11px] opacity-75">🔒</span>}
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect("budget")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${activeTab === "budget"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.5m-1.5 0h-1.5m-8.25 0H6m1.5 0H6" />
            </svg>
            <span>Budget Management</span>
            {!isSectionUnlocked("lms_budget") && <span className="text-[11px] opacity-75">🔒</span>}
          </button>
        </div>


        {/* ======================================================= */}
        {/* TAB 1: REPOSITORY (My-Repo / Shared-Repo / Search) */}
        {/* ======================================================= */}
        {activeTab === "repo" && (
          !userAccess ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <GlobalLoader fullScreen={false} sublabel="Verifying CryoSearch access..." />
            </div>
          ) : !isSectionUnlocked("lms_repo") ? (
            <LockedSectionCard
              sectionKey="lms_repo"
              onUnlock={() => {
                setPurchaseTargetSection("lms_repo");
                setIsPurchaseModalOpen(true);
              }}
              onViewFreeSection={() => setActiveTab("access")}
            />
          ) : (
          <div>
            {/* Search & Mode Bar */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              {/* My-Repo vs Shared-Repo pill selector */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setRepoMode("my")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${repoMode === "my"
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  My-Repo
                </button>
                <button
                  type="button"
                  onClick={() => setRepoMode("shared")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${repoMode === "shared"
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
          )
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
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${accessSubTab === "received"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Received Requests ({receivedRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setAccessSubTab("sent")}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${accessSubTab === "sent"
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
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${req.requestStatus === "Approved"
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
        {/* TAB 5: STOCK MANAGEMENT */}
        {/* ======================================================= */}
        {activeTab === "stock" && (
          !userAccess ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <GlobalLoader fullScreen={false} sublabel="Verifying Stock Management access..." />
            </div>
          ) : !isSectionUnlocked("lms_stock") ? (
            <LockedSectionCard
              sectionKey="lms_stock"
              onUnlock={() => {
                setPurchaseTargetSection("lms_stock");
                setIsPurchaseModalOpen(true);
              }}
              onViewFreeSection={() => setActiveTab("access")}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
              <CryoStockWrapper />
            </div>
          )
        )}

        {/* ======================================================= */}
        {/* TAB 6: BUDGET MANAGEMENT */}
        {/* ======================================================= */}
        {activeTab === "budget" && (
          !userAccess ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <GlobalLoader fullScreen={false} sublabel="Verifying Budget Management access..." />
            </div>
          ) : !isSectionUnlocked("lms_budget") ? (
            <LockedSectionCard
              sectionKey="lms_budget"
              onUnlock={() => {
                setPurchaseTargetSection("lms_budget");
                setIsPurchaseModalOpen(true);
              }}
              onViewFreeSection={() => setActiveTab("access")}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
              <CryoBudgetWrapper />
            </div>
          )
        )}

        {/* ======================================================= */}
        {/* TAB 7: LOG BOOK */}
        {/* ======================================================= */}
        {activeTab === "logbook" && (
          !userAccess ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <GlobalLoader fullScreen={false} sublabel="Verifying Logbook access..." />
            </div>
          ) : !isSectionUnlocked("lms_logbook") ? (
            <LockedSectionCard
              sectionKey="lms_logbook"
              onUnlock={() => {
                setPurchaseTargetSection("lms_logbook");
                setIsPurchaseModalOpen(true);
              }}
              onViewFreeSection={() => setActiveTab("access")}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
              <CryoLabLogbookWrapper />
            </div>
          )
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
        onSendEmailInvite={handleSendEmailInvite}
      />

      <AllowedUsersModal
        isOpen={isAllowedUsersOpen}
        users={allowedUsers}
        onClose={() => setIsAllowedUsersOpen(false)}
        onRevokeAccess={handleRevokeAccess}
      />

      <LmsPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        targetSection={purchaseTargetSection}
        onSuccess={(unlockedSections) => {
          loadUserAccess();
          if (unlockedSections.includes("lms_repo")) setActiveTab("repo");
          else if (unlockedSections.includes("lms_stock")) setActiveTab("stock");
          else if (unlockedSections.includes("lms_budget")) setActiveTab("budget");
          else if (unlockedSections.includes("lms_logbook")) setActiveTab("logbook");
        }}
      />
    </div>
  );
}

function LockedSectionCard({
  sectionKey,
  onUnlock,
  onViewFreeSection,
}: {
  sectionKey: "lms_repo" | "lms_logbook" | "lms_stock" | "lms_budget";
  onUnlock: () => void;
  onViewFreeSection: () => void;
}) {
  const config = {
    lms_repo: {
      badge: "Premium Module · Cell Banking & Storage",
      title: "CryoSearch Repository & Storage is Locked",
      description:
        "Unlock interactive 2D visual rack & box layout, cryovial inventory management, dewar tracking, color code mapping, and bench solution calculators.",
      features: [
        "Interactive 2D Grid Storage & Rack Matrix",
        "Cell line color code mapping & cryovial barcodes",
        "Dewar location & LN2 tank management",
        "Collaborative repository access request workflow",
      ],
      price: "₹1,499",
      icon: (
        <svg className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      ),
    },
    lms_logbook: {
      badge: "Premium Module · Electronic Lab Notebook",
      title: "Lab Logbook & Protocols is Locked",
      description:
        "Unlock electronic lab notebook entries, experiment protocol documentation, instrument run logs, and workspace permissions.",
      features: [
        "Collaborative ELN entry & protocol editor",
        "Instrument run logs & maintenance history",
        "Workspace team roles & granular access permissions",
        "Activity timelines & export capabilities",
      ],
      price: "₹1,999",
      icon: (
        <svg className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    lms_stock: {
      badge: "Premium Module · Lab Inventory",
      title: "Stock Management is Locked",
      description:
        "Unlock reagent & chemical inventory tracking, automatic low stock deficit alerts, and stock issue transaction logs.",
      features: [
        "Reagent, consumable & chemical inventory tracking",
        "Automatic stock deficit & expiration alerts",
        "Stock issue transactions & usage history",
        "Storage location & vendor management",
      ],
      price: "₹1,499",
      icon: (
        <svg className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      ),
    },
    lms_budget: {
      badge: "Premium Module · Lab Finance",
      title: "Budget Management is Locked",
      description:
        "Unlock lab budget head management, grant allocation tracking, expense submission forms, and financial utilization analytics.",
      features: [
        "Custom budget heads & grant allocation tracking",
        "Expense submission & approval workflows",
        "Real-time budget utilization reports & analytics",
        "Exportable financial summary logs",
      ],
      price: "₹1,499",
      icon: (
        <svg className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.5m-1.5 0h-1.5m-8.25 0H6m1.5 0H6" />
        </svg>
      ),
    },
  }[sectionKey];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-center">
      {/* Background glow overlay */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-xl flex flex-col items-center">
        {/* Top Icon Badge */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 shadow-xs border border-pink-100">
          {config.icon}
        </div>

        <span className="mb-3 inline-block rounded-full bg-slate-100 px-3.5 py-1 text-xs font-semibold text-slate-700">
          {config.badge}
        </span>

        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {config.title}
        </h3>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-lg">
          {config.description}
        </p>

        {/* Feature List */}
        <div className="mt-6 w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            What&apos;s Included in this Module
          </p>
          <ul className="space-y-2 text-xs text-slate-700">
            {config.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  ✓
                </span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bundle Banner */}
        <div className="mt-6 w-full rounded-2xl bg-linear-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-200 p-4 text-xs text-slate-800 flex items-center justify-between gap-4">
          <div className="text-left">
            <span className="font-bold text-pink-700">✨ Bundle Offer:</span> Get all 4 LMS modules for <strong className="text-slate-950">₹3,999</strong> (Save ₹2,497)
          </div>
          <span className="rounded-full bg-pink-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
            Best Value
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={onUnlock}
            className="w-full sm:w-auto flex-1 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all transform active:scale-95"
          >
            Unlock Access ({config.price})
          </button>
          <button
            type="button"
            onClick={onViewFreeSection}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            Access Requests (Free)
          </button>
        </div>
      </div>
    </div>
  );
}

function CryoStockWrapper() {
  const [subTab, setSubTab] = useState<"dashboard" | "inventory" | "issue" | "activity" | "settings">("dashboard");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [inventoryFilters, setInventoryFilters] = useState<{ expiryStatus?: string; availability?: string; showAdd?: boolean; showEdit?: string } | undefined>(undefined);

  const handleNavigate = (
    targetSubTab: "inventory" | "issue" | "activity" | "settings",
    filters?: { expiryStatus?: string; availability?: string; showAdd?: boolean }
  ) => {
    setSelectedItemId(null);
    if (filters) setInventoryFilters(filters);
    setSubTab(targetSubTab);
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  return (
    <LabWorkspaceProvider>
      <div className="space-y-4">
        <div className="border-b border-slate-200 bg-white px-6 pt-4 pb-0">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 shadow-sm text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Stock Management</h2>
              <p className="text-xs text-slate-500">Track reagents, inventory, issue requests & storage</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "inventory", label: "Inventory" },
              { id: "issue", label: "Issue Stock" },
              { id: "activity", label: "Activity Log" },
              { id: "settings", label: "Settings" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedItemId(null);
                  setSubTab(item.id as typeof subTab);
                }}
                className={`flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${subTab === item.id && !selectedItemId
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          {selectedItemId ? (
            <StockItemDetail
              itemId={selectedItemId}
              onBack={() => setSelectedItemId(null)}
              onEdit={(id) => {
                setSelectedItemId(null);
                setInventoryFilters({ showEdit: id });
                setSubTab("inventory");
              }}
            />
          ) : (
            <>
              {subTab === "dashboard" && (
                <StockDashboard onNavigate={handleNavigate} onSelectItem={handleSelectItem} />
              )}
              {subTab === "inventory" && (
                <StockInventory filters={inventoryFilters} onSelectItem={handleSelectItem} />
              )}
              {subTab === "issue" && <StockIssue />}
              {subTab === "activity" && <StockActivity />}
              {subTab === "settings" && <StockSettings />}
            </>
          )}
        </div>
      </div>
    </LabWorkspaceProvider>
  );
}
