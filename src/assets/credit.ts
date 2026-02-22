export const head_project = {
    director: ["GR'BR"],
    support_director: ["Kens", "Mobie", "TelTriNo", "akikungz"],
}

export const research = {
    Research: ["GR'BR", "Kens", "Mobie", "Nong partoo", "PochiSan", "TelTriNo", "YUKIHIME"],
}

export const art = {
    full_cg_sketch: ["Demu", "Doggy", "NOGEAAR"],
    full_cg_line_cleanup: ["NOGEAAR", "ทัมทัม"],
    full_cg_base_color: ["Akane", "NOGEAAR", "MartinaCWaifu"],
    full_cg_background: ["gGameyy"],
    full_cg_shading: ["MartinaCWaifu"],
    full_cg_composite: ["gGameyy", "MartinaCWaifu"],
    minigame_background: ["Nong partoo"],
    chibi: ["GR'BR", "Listhm", "YUKIHIME"],
    asset: ["Akane", "Doggy", "GR'BR", "Listhm", "Nemi", "YUKIHIME", "ทัมทัม"]
}

export const programmer = {
    minigame_developer: ["Listhm", "ZeroBew", "akikungz", "japanlg"],
    game_integration: ["akikungz"]
}

export const video_editor = {
    editor: ["Homura-San", "Kens", "japanlg"],
    end_credit: ["Kens"],
    pv: ["Homura-San"],
    character_motion: ["japanlg"],
}

export const project_manager = {
    manager: ["TelTriNo"],
    assistant_manager: ["GR'BR", "Mobie", "PochiSan", "YUKIHIME", "akikungz"]
}

export const key_map: Record<keyof typeof head_project | keyof typeof art | keyof typeof programmer | keyof typeof video_editor | keyof typeof project_manager, string> = {
    director: "Director",
    support_director: "Support Director",
    full_cg_sketch: "Full CG Sketch",
    full_cg_line_cleanup: "Full CG Line Cleanup",
    full_cg_base_color: "Full CG Base Color",
    full_cg_background: "Full CG Background",
    full_cg_shading: "Full CG Shading",
    full_cg_composite: "Full CG Composite",
    minigame_background: "Minigame Background",
    chibi: "Chibi",
    asset: "Asset",
    minigame_developer: "Minigame Developer",
    game_integration: "Game Integration",
    editor: "Editor",
    end_credit: "End Credit",
    pv: "PV",
    character_motion: "Character Motion",
    manager: "Manager",
    assistant_manager: "Assistant Manager",
}
