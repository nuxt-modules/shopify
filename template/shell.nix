{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = with pkgs; [
        bun
        git
    ];

    NODE_ENV="development";
    NODE_NO_WARNINGS=1;
}
