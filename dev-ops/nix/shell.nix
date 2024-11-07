{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = with pkgs; [
        nodejs_20
        nodejs_20.pkgs.pnpm
    ];

    NODE_ENV="development";
}
