use eframe::egui;
use std::sync::Arc;

use crate::api;
use crate::ApplicationState;

pub fn main(state: &mut ApplicationState, api: &api::NextAPIClient, ctx: &eframe::egui::Context) {
    egui::Window::new("Log In").show(ctx, move |ui| {
        ui.set_max_width(275.0);

        ui.horizontal(|ui| {
            ui.label("Email: ");
            ui.text_edit_singleline(&mut state.username);
        });

        ui.horizontal(|ui| {
            let label = ui.label("Password: ");
            ui.add(egui::TextEdit::singleline(&mut state.password).password(true))
                .labelled_by(label.id);
        });

        if ui.button("Login").clicked() {
            let token_clone = Arc::clone(&state.token);
            api.login(
                state.username.as_str(),
                state.password.as_str(),
                Box::new(move |res: api::LoginResponse| match res.token {
                    Some(x) => {
                        let mut token = token_clone.lock().unwrap();
                        *token = x;
                    }
                    None => {
                        let mut token = token_clone.lock().unwrap();
                        *token = "".to_string();
                    }
                }),
            );
        }
    });
}
